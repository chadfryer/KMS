# Questionnaire Manager

A simple web application for managing questionnaires with questions and answer key pairs.

## Features

- Add new question-answer pairs
- View all existing question-answer pairs
- Persistent storage using SQLite database

## Setup

1. Create a virtual environment (recommended):
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

## Running the Application

1. Start the server:
```bash
python main.py
```

2. Open your web browser and navigate to:
```
http://localhost:8000
```

## Usage

- Use the form at the top of the page to add new question-answer pairs
- View all existing pairs in the list below the form
- The data is automatically saved to the SQLite database

## Technologies Used

- FastAPI (Backend)
- SQLAlchemy (Database ORM)
- SQLite (Database)
- Jinja2 (Templating)
- Tailwind CSS (Styling) 