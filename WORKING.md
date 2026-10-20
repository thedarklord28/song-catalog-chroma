Part 1: Connecting to the Cloud & Pulling Data

python
connection = oracledb.connect(user=DB_USER, password=DB_PASSWORD, dsn=DB_DSN)
Use code with caution.
1. The Handshake: Python logs into your remote FreeSQL Cloud Database using your schema username and password.
2. The Mega-Query: It runs a massive SQL SELECT statement using JOIN commands. Instead of just grabbing raw IDs, it reaches across your tables (SONG, ARTIST, ALBUM, GENRE) to pull a beautifully flattened list containing the title, artist name, genre name, and—most importantly—those 5 acoustic feature columns (danceability, energy, etc.).
3. Dataframe Conversion: It drops all that live cloud data into a neat internal table in Python called a songs_df (Pandas DataFrame) and safely closes the internet connection.

Part 2: Building the Brain (ChromaDB)

python
chroma_client = chromadb.PersistentClient(path="./music_vector_db")
col = chroma_client.create_collection("songs", metadata={"hnsw:space": "l2"})
Use code with caution.
1. The Vector Safe: This initialises your local vector database on your computer. It tells ChromaDB: "Use Euclidean Distance (l2) as our math logic. If two tracks have coordinates that are geometrically close together, they are a match."
2. Bulk Loading the Vectors:python
col.add(ids=..., embeddings=..., documents=..., metadatas=...)
Use code with caution.
It uploads your songs into ChromaDB by separating them into four distinct parts:
	• ids: The unique key (S1, S2) which acts as the hook linking back to your FreeSQL records.
	• embeddings: The 5 acoustic features. These numbers become a 5D coordinate point on a mathematical map.
	• documents: A text backup search string (e.g., "Bleach by 5 Seconds of Summer, Pop-rock").
	• metadatas: A structural payload containing everything else (year, language, album) for filtering.

Part 3: Reading User History & Finding "Taste Vectors"

python
likes_df = pd.read_csv("user_likes.csv")
Use code with caution.
1. Read Listening Records: The script opens your local file user_likes.csv to see who liked what.
2. Isolate Favorite Tracks: For a given user (like U1), it filters out any track where their rating is low, pulling a list of only their absolute favourite songs (ratings ≥ 4).
3. The Mathematical Magic (The Average Taste Vector):python
user_taste_vector = np.mean(vecs, axis=0).tolist()
Use code with caution.
This is the coolest part of the script. It fetches the 5D coordinates for every song the user loved and calculates the exact average center point. This creates a brand new, invisible coordinate that acts as the user's personalized musical fingerprint/taste vector.

Part 4: Querying for Recommendations

python
search_results = col.query(query_embeddings=[user_taste_vector], ...)
Use code with caution.
1. The Target Search: The script drops that user’s customized "taste vector" coordinate back into ChromaDB and says: "Find me songs that sit closest to this exact spot on the map."
2. Filtering Out Already Seen Tracks: It looks at the results, checks them against the user's history, and automatically filters out any tracks the user has already listened to and rated.
3. Printing the Output: It formats and prints the top 3 best matching tracks to your terminal console, complete with a "Distance Score" (the lower the distance score, the more perfect the sonic match!).

Pipeline Data Lifecycle Summary


Script Component Phase	Technical Processing Action	Where the Data Moves
Phase 1: Syncing	Pulls raw database strings and vector numbers	FreeSQL Cloud → Python Engine
Phase 2: Indexing	Map 5 coordinates onto a geometric landscape	Python Engine → Local ChromaDB Folder
Phase 3: Profiling	Averages track features to isolate a favorite sweet spot	user_likes.csv → User Taste Vector
Phase 4: Outputting	Returns closest geometric matches excluding history	ChromaDB Map → Terminal Print Out

1. Midpoint Logic

1. User Midpoint: If User 1 loves S1 and S2, the code takes the 5 coordinates for S1 and the 5 coordinates for S2 and calculates their mathematical midpoint (the average). This creates a single point in space called the "User Taste Vector."
2. The Proximity Scan: It then looks at all the other songs in your collection (songs the user hasn't heard yet) and measures the physical distance from their 5 coordinate positions to that user midpoint.
3. The Recommendation: The songs that sit closest to that midpoint are your top recommendations.

2. Why Euclidean Distance (l2) instead of Cosine?

In vector databases, you usually choose between Euclidean Distance (measuring the raw straight-line distance between points) and Cosine Similarity (measuring the angle between two arrows pointing from the center).
For Spotify-style acoustic features, Euclidean distance is generally preferred because:
• The Scale is Locked: All 5 of your attributes (danceability, energy, etc.) are already strictly normalized between 0.0 and 1.0. Because they share the exact same scale, a straight-line physical distance measurement is highly accurate.
• Magnitude Matters: In music, the intensity (magnitude) of a value matters. A song with an energy of 0.9 is drastically different from a song with an energy of 0.2. Cosine similarity sometimes ignores magnitude because it only cares about the directional angle of the attributes. Euclidean distance ensures that a heavy, energetic song stays far away from a quiet, acoustic one.

3. Why ChromaDB?

You might wonder: "If it's just math, why can't I just calculate this inside Oracle or with standard Python lists?"
As a beginner, ChromaDB is the absolute best choice for this project for three key reasons:
• Zero-Configuration Setup: Traditional database vector extensions (like Oracle AI Vector Search or pgvector for PostgreSQL) require complex server-side installations and heavy memory allocations. ChromaDB is "serverless"—it installs with a single pip install command and runs directly inside your application folder.
• Speed via HNSW Indexing: Right now, you only have 35 songs, so standard math would be fast. But if your database grows to 10,000 or 1,000,000 songs, calculating the midpoint distance against every single song sequentially would crash your app. ChromaDB uses an advanced indexing algorithm called HNSW (Hierarchical Navigable Small World). It turns your song map into an interconnected "web," allowing it to find the closest songs instantly without scanning the entire database.
• Relational Filtering: ChromaDB allows you to attach a metadata dictionary to your vectors. This means you can ask it to: "Find songs closest to this midpoint, BUT filter out songs by the same artist." Doing that purely in Python math requires writing complex filtering loops yourself.

Distance Metric & Database Comparison


Feature Metric	Euclidean Distance (l2)	Cosine Similarity
How it measures	Straight-line distance between two coordinates.	The angular deviation between two vector arrows.
Best Used For	Strictly bounded, normalized numeric sets (0.0 to 1.0).	Text embeddings where document length varies wildly.
Handling of Magnitude	Strong (Detects variations in feature intensity).	Weak (Focuses on the relative ratio of features).

