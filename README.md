# Acoustic Fingerprint Workspace

An interactive full-stack recommendation engine and vector space visualization dashboard that maps tracks based on acoustic features (danceability, energy, valence, acousticness, and tempo norm).

Built with Python, ChromaDB, Oracle FreeSQL, Pandas, and React.

---

## Key Features
- **Vector Space Indexing:** Leverages ChromaDB with HNSW index spaces to compute geometric Euclidean distances between tracks.
- **Hybrid Recommendation Engine:** Generates real-time song similarity matches and aggregates explicit user review data (`user_likes.csv`) to compute user taste profile midpoints.
- **Multi-Attribute Filtering:** Filter catalogs and recommendations dynamically by **Genre**, **Artist**, and **Decade**.
- **Interactive React Dashboard:** Features a Cartesian coordinate plotting plane and dynamic track fingerprint visualizers.
- **Database Fallback:** Automatically connects to Oracle Cloud FreeSQL; falls back to a local robust dataset (`songs_dataset.csv`) if a connection timeout or network issue occurs.

---

## Tech Stack
- **Backend / Pipeline:** Python, Pandas, NumPy, ChromaDB, OracleDB (`oracledb`), `python-dotenv`
- **Frontend:** React, JavaScript, CSS Grid/Flexbox
- **Data Storage:** Local CSV backups, ChromaDB persistent vector store

---

## Getting Started

### 1. Clone the Repository
```bash
git clone [https://github.com/your-username/your-repo-name.git](https://github.com/your-username/your-repo-name.git)
cd your-repo-name
```

### 2. Set Up the Python Backend & Dependencies
Install the required packages:
```bash
pip install chromadb numpy pandas oracledb python-dotenv
```

Create a `.env` file in your root directory to securely store your Oracle Cloud FreeSQL database credentials:
```env
DB_USER=your_db_user
DB_PASSWORD=your_db_password
DB_DSN=your_oracle_dsn
```

Run the pipeline script to fetch data, configure the vector database, and generate the React dashboard payload:
```bash
python run_pipeline.py
```

### 3. Run the Frontend Dashboard
Navigate into your React project directory, install dependencies, and start the development server:
```bash
npm install
npm run dev
```

---

## Project Structure
```text
project-song-catalog/                 <-- Main Root Project Folder
│
├── music_vector_db/                  <-- AUTOMATICALLY CREATED (Stores your ChromaDB vector files)
│   ├── chroma.sqlite3
│   └── [index data files]
│
├── node_modules/                     <-- AUTOMATICALLY CREATED (Stores React/Vite development packages)
│
├── src/                              <-- React Frontend Source Files Folder
│   ├── App.jsx                       <-- Holds your main minimalist pastel dashboard code
│   ├── main.jsx                      <-- Binds your React application to the index.html template
│   └── dashboard_data.json           <-- UPDATED BY PYTHON (The clean JSON data from FreeSQL)
│
├── index.html                        <-- Main HTML layout loader for Vite
├── package.json                      <-- Manages React dependencies and script runner settings
├── package-lock.json                 <-- Automatically locked Node package version tree
├── vite.config.js                    <-- Configures the React compiler plugin settings
│
├── run_pipeline.py                   <-- Core Python Script (Connects to FreeSQL, embeds vectors, exports JSON)
├── songs_dataset.csv                 <-- Local offline track backup file
└── user_likes.csv                    <-- Local offline user reviews file
```

---

## License
This project is open-source and available under the [MIT License](LICENSE).
