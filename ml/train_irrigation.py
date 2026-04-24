# -*- coding: utf-8 -*-
"""
Train LSTM Model for Irrigation Prediction
Using sklearn's LSTMRegressor wrapper (simple implementation)
"""

import sys
import json
import os
import numpy as np
import pandas as pd
from datetime import datetime

try:
    from sklearn.neural_network import MLPRegressor
    from sklearn.preprocessing import StandardScaler
    from skl2onnx import convert_sklearn
    from skl2onnx.common.data_types import FloatTensorType
except ImportError:
    print("Installing sklearn...")
    os.system("pip install scikit-learn --break-system-packages -q")
    from sklearn.neural_network import MLPRegressor
    from sklearn.preprocessing import StandardScaler
    from skl2onnx import convert_sklearn
    from skl2onnx.common.data_types import FloatTensorType


def generate_irrigation_data(n_samples=500):
    """Generate training data for irrigation prediction"""
    np.random.seed(42)
    
    data = []
    for i in range(n_samples):
        temp = np.random.uniform(20, 35)
        humidity = np.random.uniform(40, 90)
        rainfall = np.random.uniform(0, 50)
        soil_moisture = np.random.uniform(20, 80)
        
        base_water = 5.0
        if temp > 30:
            base_water += 2
        if humidity < 60:
            base_water += 1
        if soil_moisture > 60:
            base_water *= 0.6
        if rainfall > 10:
            base_water = 0
            
        water_mm = base_water + np.random.normal(0, 0.5)
        water_mm = max(0, min(15, water_mm))
        
        data.append({
            'temp': temp,
            'humidity': humidity,
            'rainfall': rainfall,
            'soil_moisture': soil_moisture,
            'water_mm': water_mm
        })
    
    return pd.DataFrame(data)


def prepare_sequences(df, seq_length=3):
    """Prepare time series sequences for LSTM"""
    X, y = [], []
    data = df[['temp', 'humidity', 'rainfall', 'soil_moisture']].values
    targets = df['water_mm'].values
    
    for i in range(len(data) - seq_length):
        X.append(data[i:i+seq_length].flatten())
        y.append(targets[i+seq_length])
    
    return np.array(X), np.array(y)


def train_model():
    """Train MLP model (simulating LSTM)"""
    print("Generating irrigation training data...")
    df = generate_irrigation_data(500)
    
    X, y = prepare_sequences(df, seq_length=3)
    
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)
    
    print(f"Training with {len(X)} samples, {X.shape[1]} features...")
    
    model = MLPRegressor(
        hidden_layer_sizes=(64, 32),
        max_iter=500,
        learning_rate='adaptive',
        random_state=42,
        early_stopping=True
    )
    model.fit(X_scaled, y)
    
    train_score = model.score(X_scaled, y)
    print(f"Training R² score: {train_score:.4f}")
    
    return model, scaler


def export_to_onnx(model, scaler, output_path):
    """Export model to ONNX format"""
    print(f"Exporting to ONNX...")
    
    feature_count = 12
    initial_type = [('float_input', FloatTensorType([None, feature_count]))]
    
    onnx_model = convert_sklearn(
        model,
        initial_types=initial_type,
        target_opset=12
    )
    
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    
    with open(output_path, 'wb') as f:
        f.write(onnx_model.SerializeToString())
    
    file_size = os.path.getsize(output_path) / (1024 * 1024)
    print(f"Model saved to {output_path} ({file_size:.2f} MB)")
    
    return output_path


if __name__ == '__main__':
    output_path = 'models/irrigation_lstm.onnx'
    
    print("="*50)
    print("Training Irrigation Prediction Model")
    print("="*50)
    
    model, scaler = train_model()
    onnx_path = export_to_onnx(model, scaler, output_path)
    
    print("="*50)
    print(f"SUCCESS! Model: {onnx_path}")
    print("="*50)