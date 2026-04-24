# -*- coding: utf-8 -*-
"""
Federated Learning Server - Tổng hợp gradients từ nhiều farm
Chạy trên Python Flask nhẹ

ISO Standards: ISO 27001, ISO/IEC 27002

Usage:
    python federated_server.py

API Endpoints:
    - POST /submit_gradient: Nhận gradients từ client
    - POST /aggregate: Tổng hợp và trả về global model
    - GET /health: Health check
"""

from flask import Flask, request, jsonify
import numpy as np
import json
import os
from datetime import datetime
import logging

app = Flask(__name__)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

gradients_store = {}
model_store = {}
client_metadata = {}

MODEL_PATH = os.path.join(os.path.dirname(__file__), '..', 'models', 'global_model.json')

@app.route('/health', methods=['GET'])
def health():
    return jsonify({
        'status': 'ok',
        'timestamp': datetime.utcnow().isoformat(),
        'connected_clients': len(gradients_store),
        'current_round': get_current_round()
    })

def get_current_round():
    if model_store:
        return max([m.get('round', 0) for m in model_store.values()], default=0)
    return 0

@app.route('/submit_gradient', methods=['POST'])
def submit_gradient():
    try:
        data = request.json
        
        client_id = data.get('client_id')
        gradients = data.get('gradients', {})
        sample_count = data.get('sample_count', 100)
        timestamp = data.get('timestamp', datetime.utcnow().isoformat())
        
        if not client_id:
            return jsonify({'error': 'client_id required'}), 400
        
        gradients_store[client_id] = {
            'gradients': gradients,
            'sample_count': sample_count,
            'timestamp': timestamp,
            'received_at': datetime.utcnow().isoformat()
        }
        
        client_metadata[client_id] = {
            'last_submission': datetime.utcnow().isoformat(),
            'total_submissions': client_metadata.get(client_id, {}).get('total_submissions', 0) + 1
        }
        
        logger.info(f"[Federated] Received gradients from {client_id}, total clients: {len(gradients_store)}")
        
        return jsonify({
            'status': 'ok',
            'message': 'Gradients received',
            'total_clients': len(gradients_store)
        })
        
    except Exception as e:
        logger.error(f"[Federated] Error receiving gradient: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/aggregate', methods=['POST'])
def aggregate():
    try:
        requesting_client = request.json.get('requesting_client', 'unknown')
        
        if len(gradients_store) == 0:
            return jsonify({'error': 'No gradients available for aggregation'}), 400
        
        client_ids = list(gradients_store.keys())
        
        global_model = {}
        total_samples = sum([g['sample_count'] for g in gradients_store.values()])
        
        first_client = gradients_store[client_ids[0]]
        if isinstance(first_client['gradients'], dict):
            for key in first_client['gradients'].keys():
                weighted_sum = None
                
                for client_id in client_ids:
                    client_data = gradients_store[client_id]
                    client_grads = client_data['gradients']
                    client_samples = client_data['sample_count']
                    
                    if key in client_grads:
                        client_array = np.array(client_grads[key])
                        weight = client_samples / total_samples
                        
                        if weighted_sum is None:
                            weighted_sum = client_array * weight
                        else:
                            weighted_sum += client_array * weight
                
                if weighted_sum is not None:
                    global_model[key] = weighted_sum.tolist()
        
        current_round = get_current_round() + 1
        
        model_store[requesting_client] = {
            'global_model': global_model,
            'round': current_round,
            'timestamp': datetime.utcnow().isoformat(),
            'num_clients': len(gradients_store)
        }
        
        logger.info(f"[Federated] Aggregated {len(gradients_store)} clients, round {current_round}")
        
        return jsonify({
            'global_model': global_model,
            'round': current_round,
            'timestamp': datetime.utcnow().isoformat(),
            'num_clients': len(gradients_store)
        })
        
    except Exception as e:
        logger.error(f"[Federated] Aggregation error: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/get_model', methods=['GET'])
def get_model():
    try:
        current_round = get_current_round()
        if current_round == 0:
            return jsonify({'error': 'No model available'}), 404
        
        latest_model = None
        latest_round = 0
        
        for model_data in model_store.values():
            if model_data['round'] > latest_round:
                latest_round = model_data['round']
                latest_model = model_data['global_model']
        
        return jsonify({
            'global_model': latest_model,
            'round': latest_round,
            'timestamp': datetime.utcnow().isoformat()
        })
        
    except Exception as e:
        logger.error(f"[Federated] Get model error: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/reset', methods=['POST'])
def reset():
    global gradients_store, model_store
    gradients_store = {}
    model_store = {}
    logger.info("[Federated] Store reset")
    return jsonify({'status': 'ok', 'message': 'Store reset'})

@app.route('/stats', methods=['GET'])
def stats():
    return jsonify({
        'total_clients': len(gradients_store),
        'total_models': len(model_store),
        'current_round': get_current_round(),
        'client_details': client_metadata,
        'memory_usage_mb': sum([len(json.dumps(g)) for g in gradients_store.values()]) / 1024 / 1024
    })

if __name__ == '__main__':
    port = int(os.environ.get('FEDERATED_PORT', 5050))
    logger.info(f"Starting Federated Learning Server on port {port}")
    app.run(host='0.0.0.0', port=port, debug=False)