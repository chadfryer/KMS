# Questionnaire Manager

A simple web application for managing questionnaires with questions and answer key pairs.

## Features

- Add new question-answer pairs
- View all existing question-answer pairs
- Persistent storage using PostgreSQL database
- Containerized deployment with Docker

## Setup

1. Make sure you have Docker and Docker Compose installed

2. Build and start the containers:
```bash
docker-compose up --build
```

## Running the Application

1. Once the containers are running, the application will be available at:
```
http://localhost:8000
```

## Usage

- Use the form at the top of the page to add new question-answer pairs
- View all existing pairs in the list below the form
- The data is automatically saved to the PostgreSQL database

## Technologies Used

- FastAPI (Backend)
- SQLAlchemy (Database ORM)
- PostgreSQL (Database)
- Docker (Containerization)
- Jinja2 (Templating)
- Tailwind CSS (Styling) 