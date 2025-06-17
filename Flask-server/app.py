from flask import Flask, request, render_template, jsonify
from flask_cors import CORS
import numpy as np
import pandas as pd
from sklearn import metrics 
import warnings
import pickle
warnings.filterwarnings('ignore')
from feature import FeatureExtraction
from joblib import dump, load

import sklearn._loss._loss

# Monkey-patch the missing attribute
setattr(sklearn._loss._loss, '__pyx_unpickle_CyHalfBinomialLoss', lambda *a: None)

# Add these before loading
import sys
sys.modules['sklearn.ensemble._gb_losses'] = sklearn._loss._loss
file = open("pickle/model.pkl","rb")
gbc = pickle.load(file)
file.close()

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

@app.route("/", methods=["GET", "POST"])
def index():
    if request.method == "POST":
        url = request.form["url"]
        obj = FeatureExtraction(url)
        x = np.array(obj.getFeaturesList()).reshape(1,30) 

        y_pred = gbc.predict(x)[0]
        y_pro_phishing = gbc.predict_proba(x)[0,0]
        y_pro_non_phishing = gbc.predict_proba(x)[0,1]
        
        pred = "It is {0:.2f} % safe to go ".format(y_pro_phishing*100)
        return render_template('index.html', xx=round(y_pro_non_phishing,2), url=url)
    return render_template("index.html", xx=-1)

@app.route("/check", methods=["POST"])
def check_url():
    """API endpoint for Chrome extension to check URL safety"""
    try:
        data = request.get_json()
        if not data or 'url' not in data:
            return jsonify({
                'error': 'URL is required',
                'is_safe': False,
                'safety_score': 0.0
            }), 400
        
        url = data['url']
        
        # Skip checking for certain URLs
        if (url.startswith('chrome://') or 
            url.startswith('chrome-extension://') or 
            url.startswith('file://') or
            url.startswith('about:')):
            return jsonify({
                'url': url,
                'is_safe': True,
                'safety_score': 1.0,
                'message': 'Browser pages are considered safe'
            })
        
        # Extract features and make prediction
        obj = FeatureExtraction(url)
        features = obj.getFeaturesList()
        x = np.array(features).reshape(1, 30)
        
        # Get prediction and probabilities
        y_pred = gbc.predict(x)[0]
        probabilities = gbc.predict_proba(x)[0]
        
        # y_pred: 1 is safe, -1 is unsafe
        # probabilities[0] is probability of being phishing (unsafe)
        # probabilities[1] is probability of being legitimate (safe)
        
        is_safe = y_pred == 1
        safety_score = probabilities[1]  # Probability of being safe
        
        # Determine risk level
        if safety_score >= 0.8:
            risk_level = "Low"
        elif safety_score >= 0.6:
            risk_level = "Medium"
        elif safety_score >= 0.4:
            risk_level = "High"
        else:
            risk_level = "Very High"
        
        response = {
            'url': url,
            'is_safe': bool(is_safe),
            'safety_score': float(safety_score),
            'risk_level': risk_level,
            'phishing_probability': float(probabilities[0]),
            'legitimate_probability': float(probabilities[1]),
            'features_extracted': len(features),
            'message': f"Analysis complete. Safety score: {safety_score:.2%}"
        }
        
        return jsonify(response)
        
    except Exception as e:
        print(f"Error processing URL: {str(e)}")
        return jsonify({
            'error': f'Error analyzing URL: {str(e)}',
            'is_safe': False,
            'safety_score': 0.0,
            'risk_level': 'Unknown'
        }), 500

@app.route("/health", methods=["GET"])
def health_check():
    """Health check endpoint for the extension to verify server status"""
    return jsonify({
        'status': 'healthy',
        'service': 'Phishing Detection API',
        'version': '1.0'
    })

if __name__ == "__main__":
    app.run(debug=True, host='0.0.0.0', port=5000)