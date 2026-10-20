import json
import os
import chromadb
import numpy as np
import pandas as pd
import oracledb
from dotenv import load_dotenv

# ============================================================================
# PHASE 1: CONNECT TO CLOUD FREESQL OR DETECT FALLBACK
# ============================================================================
print("======================================================================")
print("PHASE 1: Fetching Baseline Data Streams...")
print("======================================================================")

DB_USER = os.getenv("DB_USER")
DB_PASSWORD = os.getenv("DB_PASSWORD")
DB_DSN = os.getenv("DB_DSN")

try:
    print(f"Connecting to FreeSQL cloud architecture as user: [{DB_USER}]...")
    connection = oracledb.connect(user=DB_USER, password=DB_PASSWORD, dsn=DB_DSN)
    
    sql_query = """
        SELECT s.song_id, 
               MAX(s.song_title) as title, 
               LISTAGG(a.artist_name, ', ') WITHIN GROUP (ORDER BY p.role DESC) as artist, 
               MAX(al.album_title) as album, 
               MAX(al.release_date) as release_date, 
               MAX(g.genre_name) as genre, 
               MAX(s.language) as language, 
               MAX(s.track_number) as track_number, 
               MAX(s.duration) as duration,
               MAX(s.danceability) as danceability, 
               MAX(s.energy) as energy, 
               MAX(s.valence) as valence, 
               MAX(s.acousticness) as acousticness, 
               MAX(s.tempo_norm) as tempo_norm
        FROM SONG s
        JOIN PERFORMS p ON s.song_id = p.song_id
        JOIN ARTIST a ON p.artist_id = a.artist_id
        JOIN ALBUM al ON s.album_id = al.album_id
        JOIN CATEGORIZED_AS c ON s.song_id = c.song_id
        JOIN GENRE g ON c.genre_id = g.genre_id
        GROUP BY s.song_id
    """
    songs_df = pd.read_sql(sql_query, con=connection)
    connection.close()
    print(f"SUCCESS: Synced {len(songs_df)} live tracks directly from FreeSQL Cloud!")

except Exception as error_log:
    print(f"DATABASE REJECTION ALERT: {error_log}")
    print("ACTION: Launching fallback array. Reading straight from local 'songs_dataset.csv'...")
    try:
        songs_df = pd.read_csv("songs_dataset.csv")
        print(f"SUCCESS: Formatted {len(songs_df)} songs from your local backup tracking file.")
    except FileNotFoundError:
        print("CRITICAL ERROR: Could not find 'songs_dataset.csv' in this folder. Please verify pathing.")
        exit()

# Safely derive a 'year' column from 'release_date'
if "release_date" in songs_df.columns:
    songs_df["year"] = pd.to_datetime(songs_df["release_date"], errors="coerce").dt.year.fillna(2020).astype(int)
elif "year" not in songs_df.columns:
    songs_df["year"] = 2020  # Absolute fallback if neither column exists

# ============================================================================
# PHASE 2: INITIALISE AND MAP THE VECTOR SPACE (CHROMADB)
# ============================================================================
print("\n======================================================================")
print("PHASE 2: Configuring Vector Space via ChromaDB Indexing...")
print("======================================================================")

chroma_client = chromadb.PersistentClient(path="./music_vector_db")

try:
    chroma_client.delete_collection("songs")
except Exception:
    pass

col = chroma_client.create_collection("songs", metadata={"hnsw:space": "l2"})

# Normalize column casing instantly to lower-case
songs_df.columns = [col.lower() for col in songs_df.columns]

FEATURES = ["danceability", "energy", "valence", "acousticness", "tempo_norm"]

# Load vectors into ChromaDB
col.add(
    ids=songs_df["song_id"].astype(str).tolist(),
    embeddings=songs_df[FEATURES].values.tolist(),
    documents=[f"{r.title} by {r.artist}, {r.genre}" for r in songs_df.itertuples()],
    metadatas=[{
        "title": str(r.title),
        "artist": str(r.artist),
        "album": str(r.album),
        "genre": str(r.genre),
        "language": str(r.language),
        "track_number": int(r.track_number),
        "duration": str(r.duration)
    } for r in songs_df.itertuples()],
)
print(f"SUCCESS: Wrapped and indexed {col.count()} tracking vector layers into local ChromaDB storage!")

# ============================================================================
# NEW ADDITION: GENERATE AND NEST LIVE CHROMADB RECOMMENDATIONS
# ============================================================================
print("\nCalculating live vector similarity maps for frontend export...")
songs_list_with_recs = []

for r in songs_df.itertuples():
    song_vector = [float(r.danceability), float(r.energy), float(r.valence), float(r.acousticness), float(r.tempo_norm)]
    query_results = col.query(query_embeddings=[song_vector], n_results=4, include=["metadatas", "distances"])
    
    song_recommendations = []
    #Unpack the inner list via [0] index
    for match_id, meta, distance in zip(query_results["ids"][0], query_results["metadatas"][0], query_results["distances"][0]):
        if match_id != r.song_id:
            song_recommendations.append({
                "song_id": match_id,
                "title": meta["title"],
                "artist": meta["artist"],
                "genre": meta["genre"],
                "distance": str(round(distance, 4))
            })
            
    decade_string = f"{(int(r.year) // 10) * 10}s"
            
    song_entry = {
        "song_id": r.song_id,
        "title": r.title,
        "artist": r.artist,
        "album": r.album,
        "genre": r.genre,
        "language": r.language,
        "year": int(r.year),
        "decade": decade_string,
        "track_number": int(r.track_number),
        "duration": r.duration,
        "danceability": float(r.danceability),
        "energy": float(r.energy),
        "valence": float(r.valence),
        "acousticness": float(r.acousticness),
        "tempo_norm": float(r.tempo_norm),
        "recommendations": song_recommendations
    }
    songs_list_with_recs.append(song_entry)

# --- ISOLATE DYNAMIC FILTER ATTRIBUTES ---
unique_genres = sorted(songs_df["genre"].unique().tolist())
unique_artists = sorted(songs_df["artist"].unique().tolist())
# Map and sort mathematical unique decades present in dataset
unique_decades = sorted(list(set([f"{(int(y) // 10) * 10}s" for y in songs_df["year"].unique()])), reverse=True)

# --- CALCULATE USER CUSTOM PROFILE MIDPOINTS ---
print("Aggregating local 'user_likes.csv' to generate custom user profiles...")
user_profiles_list = []

try:
    likes_df = pd.read_csv("user_likes.csv")
    unique_users = likes_df["user_id"].unique()

    for uid in unique_users:
        user_rows = likes_df[likes_df.user_id == uid]
        liked_ids = user_rows[user_rows.rating >= 4]["song_id"].tolist()
        history_seen = user_rows["song_id"].tolist()
        
        if liked_ids:
            vector_bundle = col.get(ids=liked_ids, include=["embeddings"])
            coordinate_points = vector_bundle["embeddings"]
            user_taste_midpoint = np.mean(coordinate_points, axis=0).tolist()
            
            search_scope = 3 + len(history_seen)
            raw_query_results = col.query(
                query_embeddings=[user_taste_midpoint], 
                n_results=search_scope, 
                include=["metadatas", "distances"]
            )
            
            user_recs = []
            #Unpack the inner list via [0] index here as well
            for match_id, meta, distance in zip(raw_query_results["ids"][0], raw_query_results["metadatas"][0], raw_query_results["distances"][0]):
                if match_id not in history_seen and len(user_recs) < 3:
                    user_recs.append({
                        "song_id": match_id,
                        "title": meta["title"],
                        "artist": meta["artist"],
                        "genre": meta["genre"],
                        "distance": str(round(distance, 4))
                    })
            
            user_profiles_list.append({
                "user_id": uid,
                "midpoint": {
                    "danceability": round(user_taste_midpoint[0], 2),
                    "energy": round(user_taste_midpoint[1], 2),
                    "valence": round(user_taste_midpoint[2], 2),
                    "acousticness": round(user_taste_midpoint[3], 2),
                    "tempo_norm": round(user_taste_midpoint[4], 2)
                },
                "personalized_recs": user_recs
            })
            
except FileNotFoundError:
    print("Warning: 'user_likes.csv' missing. Creating empty user profile arrays.")

# --- EXPORT UNIFIED WORKSPACE PAYLOAD ---
output_payload = {
    "catalog": songs_list_with_recs,
    "user_profiles": user_profiles_list,
    "available_filters": {
        "genres": unique_genres,
        "artists": unique_artists,
        "decades": unique_decades
    }
}

react_data_path = os.path.join("src", "dashboard_data.json")
os.makedirs("src", exist_ok=True)
with open(react_data_path, "w", encoding="utf-8") as json_file:
    json.dump(output_payload, json_file, indent=2)
print(f"SUCCESS: Exported live unified dataset package with upgraded metadata filters to {react_data_path}")

# ============================================================================
# PHASE 3: AGGREGATE PROFILES & SCAN GEOMETRIC DISTANCES
# ============================================================================
print("\n======================================================================")
print("PHASE 3: Running Core Hybrid Recommendation Matrix...")
print("======================================================================")

try:
    likes_df = pd.read_csv("user_likes.csv")
    print(f"Loaded User Matrix file containing {len(likes_df)} explicit review logs.\n")
except FileNotFoundError:
    print("CRITICAL ERROR: 'user_likes.csv' missing from folder. Please verify setup.")
    exit()

def execute_recommendation_pipeline(target_user, num_recommendations=3):
    user_rows = likes_df[likes_df.user_id == target_user]
    
    favorite_tracks = user_rows[user_rows.rating >= 4].song_id.tolist()
    history_exclusion_list = user_rows.song_id.tolist()
    
    if not favorite_tracks:
        print(f"INFO: User Profile {target_user} has insufficient tracking history to process.")
        return

    vector_bundle = col.get(ids=favorite_tracks, include=["embeddings"])
    coordinate_points = vector_bundle["embeddings"]
    
    user_taste_midpoint = np.mean(coordinate_points, axis=0).tolist()
    
    search_scope = num_recommendations + len(history_exclusion_list)
    raw_query_results = col.query(
        query_embeddings=[user_taste_midpoint], 
        n_results=search_scope, 
        include=["metadatas", "distances"]
    )
    
    print(f"SYSTEM OUTPUT: Top {num_recommendations} Personalised Track Picks for {target_user}:")
    printed_count = 0
    
    for match_id, record, distance in zip(raw_query_results["ids"][0], raw_query_results["metadatas"][0], raw_query_results["distances"][0]):
        if match_id not in history_exclusion_list and printed_count < num_recommendations:
            print(f"   [{match_id}] '{record['title']}' by {record['artist']}")
            print(f"     Genre: {record['genre']} | Track #{record['track_number']} | Euclidean Distance Error: {round(distance, 4)}")
            printed_count += 1

execute_recommendation_pipeline("U1", num_recommendations=3)
print("-" * 70)
execute_recommendation_pipeline("U5", num_recommendations=3)
print("======================================================================")
