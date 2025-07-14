


from flask import Flask, request, jsonify
import joblib
import pandas as pd

app = Flask(__name__)
clf = joblib.load('recommendation_model.pkl')
feature_columns = joblib.load('feature_columns.pkl')

@app.route('/score', methods=['POST'])
def score():
    data = request.json['data']  # List of dicts
    X = pd.DataFrame(data)[feature_columns].fillna(0)
    scores = clf.predict_proba(X)[:,1]
    return jsonify([float(s) for s in scores])

if __name__ == '__main__':
    app.run(port=5005)