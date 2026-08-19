from flask import Flask
from app.models import Database

def create_app():
    app = Flask(__name__, static_folder='../static', static_url_path='')
    app.config['SECRET_KEY'] = 'aasthas-secret-key-12345'
    
    # Initialize the database
    Database.init_db()
    
    # Register routes
    from app.routes import api
    app.register_blueprint(api)
    
    # Serve index.html at root
    @app.route('/')
    def index():
        return app.send_static_file('index.html')
        
    return app
