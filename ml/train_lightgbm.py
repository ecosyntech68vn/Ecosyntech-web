# -*- coding: utf-8 -*-
"""
LightGBM Training Script - Huấn luyện mô hình dự báo năng suất
Xuất sang định dạng ONNX để chạy trên Node.js

ISO Standards: ISO 27001, ISO 25010

Usage:
    python train_lightgbm.py [config.json]

Requirements:
    pip install pandas lightgbm scikit-learn skl2onnx onnxmltools
"""

import sys
import json
import os
import argparse
import logging
from datetime import datetime

import pandas as pd
import numpy as np

try:
    import lightgbm as lgb
    from skl2onnx import convert_sklearn
    from skl2onnx.common.data_types import FloatTensorType
except ImportError:
    print("Installing required packages...")
    os.system("pip install pandas lightgbm scikit-learn skl2onnx onnxmltools")
    import lightgbm as lgb
    from skl2onnx import convert_sklearn
    from skl2onnx.common.data_types import FloatTensorType

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


def generate_sample_data(n_samples=500):
    """Generate sample data for training (replace with real data in production)."""
    np.random.seed(42)
    
    data = {
        'temperature_avg': np.random.uniform(18, 35, n_samples),
        'rainfall_mm': np.random.uniform(0, 300, n_samples),
        'fertilizer_kg': np.random.uniform(30, 200, n_samples),
        'soil_ph': np.random.uniform(5.0, 8.0, n_samples),
        'sun_hours': np.random.uniform(4, 12, n_samples),
        'humidity_avg': np.random.uniform(40, 90, n_samples),
        'pest_presence': np.random.uniform(0, 0.5, n_samples),
        'disease_presence': np.random.uniform(0, 0.3, n_samples)
    }
    
    base_yield = 8.5
    data['yield_tons_per_ha'] = (
        base_yield
        + 0.15 * (data['temperature_avg'] - 25)
        + 0.003 * data['rainfall_mm']
        + 0.01 * data['fertilizer_kg']
        + 0.5 * (data['soil_ph'] - 6.5)
        + 0.3 * data['sun_hours']
        - 5 * data['pest_presence']
        - 8 * data['disease_presence']
        + np.random.normal(0, 0.5, n_samples)
    )
    
    data['yield_tons_per_ha'] = np.clip(data['yield_tons_per_ha'], 0, 50)
    
    return pd.DataFrame(data)


def fetch_data_from_db(db_path, query=None):
    """Fetch training data from SQLite database."""
    if not os.path.exists(db_path):
        logger.warning(f"Database not found: {db_path}, generating sample data")
        return generate_sample_data()
    
    try:
        import sqlite3
        conn = sqlite3.connect(db_path)
        
        if query is None:
            query = """
                SELECT 
                    temperature_avg,
                    rainfall_mm, 
                    fertilizer_kg,
                    soil_ph,
                    sun_hours,
                    humidity_avg,
                    pest_presence,
                    disease_presence,
                    yield_tons_per_ha
                FROM season_logs 
                WHERE yield_tons_per_ha IS NOT NULL
            """
        
        df = pd.read_sql_query(query, conn)
        conn.close()
        
        logger.info(f"Loaded {len(df)} records from database")
        return df
        
    except Exception as e:
        logger.warning(f"Failed to load from database: {e}, using sample data")
        return generate_sample_data()


def train_model(df, feature_cols, target_col, params):
    """Train LightGBM model."""
    X = df[feature_cols]
    y = df[target_col]
    
    logger.info(f"Training with {len(X)} samples, {len(feature_cols)} features")
    
    model = lgb.LGBMRegressor(**params)
    model.fit(X, y)
    
    train_score = model.score(X, y)
    logger.info(f"Training R² score: {train_score:.4f}")
    
    feature_importance = pd.DataFrame({
        'feature': feature_cols,
        'importance': model.feature_importances_
    }).sort_values('importance', ascending=False)
    
    logger.info("Feature importance:")
    for _, row in feature_importance.iterrows():
        logger.info(f"  {row['feature']}: {row['importance']:.2f}")
    
    return model


def export_to_onnx(model, feature_cols, output_path, target_opset=12):
    """Export model to ONNX format."""
    logger.info(f"Exporting to ONNX (opset {target_opset})...")
    
    initial_type = [('float_input', FloatTensorType([None, len(feature_cols)]))]
    
    onnx_model = convert_sklearn(
        model,
        initial_types=initial_type,
        target_opset=target_opset
    )
    
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    
    with open(output_path, 'wb') as f:
        f.write(onnx_model.SerializeToString())
    
    file_size = os.path.getsize(output_path) / (1024 * 1024)
    logger.info(f"Model saved to {output_path} ({file_size:.2f} MB)")
    
    return output_path


def save_model_info(output_path, feature_cols, params, metrics):
    """Save model metadata."""
    info_path = output_path.replace('.onnx', '_info.json')
    
    info = {
        'model_path': output_path,
        'feature_names': feature_cols,
        'target_column': 'yield_tons_per_ha',
        'lgb_params': params,
        'metrics': metrics,
        'created_at': datetime.utcnow().isoformat(),
        'framework': 'lightgbm',
        'onnx_version': '1.12.0'
    }
    
    with open(info_path, 'w') as f:
        json.dump(info, f, indent=2)
    
    logger.info(f"Model info saved to {info_path}")


def train_and_export(config):
    """Main training and export pipeline."""
    logger.info("=" * 50)
    logger.info("Starting LightGBM Training Pipeline")
    logger.info("=" * 50)
    
    db_path = config.get('db_path', 'data/ecosyntech.db')
    output_path = config.get('output_model_path', 'models/lightgbm_yield.onnx')
    feature_cols = config.get('feature_cols')
    target_col = config.get('target_col', 'yield_tons_per_ha')
    lgb_params = config.get('lgb_params', {})
    min_samples = config.get('min_samples', 10)
    generate_sample = config.get('generate_sample_if_missing', True)
    
    df = fetch_data_from_db(db_path)
    
    if len(df) < min_samples:
        if generate_sample:
            logger.warning(f"Insufficient data ({len(df)} < {min_samples}), generating sample data")
            df = generate_sample_data(200)
        else:
            raise ValueError(f"Insufficient training data: {len(df)} samples")
    
    if feature_cols is None:
        feature_cols = [col for col in df.columns if col != target_col]
    
    logger.info(f"Features: {feature_cols}")
    logger.info(f"Target: {target_col}")
    logger.info(f"Samples: {len(df)}")
    
    default_params = {
        'n_estimators': 100,
        'max_depth': 6,
        'num_leaves': 31,
        'learning_rate': 0.05,
        'objective': 'regression',
        'random_state': 42,
        'min_child_samples': 20,
        'subsample': 0.8,
        'colsample_bytree': 0.8,
        'verbosity': -1
    }
    
    params = {**default_params, **lgb_params}
    
    model = train_model(df, feature_cols, target_col, params)
    
    train_score = model.score(df[feature_cols], df[target_col])
    metrics = {
        'train_r2': train_score,
        'n_samples': len(df),
        'n_features': len(feature_cols)
    }
    
    onnx_path = export_to_onnx(model, feature_cols, output_path)
    
    save_model_info(onnx_path, feature_cols, params, metrics)
    
    logger.info("=" * 50)
    logger.info("Training Complete!")
    logger.info(f"Model: {onnx_path}")
    logger.info(f"R² Score: {train_score:.4f}")
    logger.info("=" * 50)
    
    return {
        'success': True,
        'model_path': onnx_path,
        'metrics': metrics
    }


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Train LightGBM and export to ONNX')
    parser.add_argument('config', nargs='?', help='Path to config JSON file')
    parser.add_argument('--db-path', help='Path to SQLite database')
    parser.add_argument('--output', help='Output ONNX file path')
    args = parser.parse_args()
    
    if args.config and os.path.exists(args.config):
        with open(args.config, 'r') as f:
            config = json.load(f)
    else:
        default_config = {
            'db_path': args.db_path or 'data/ecosyntech.db',
            'output_model_path': args.output or 'models/lightgbm_yield.onnx',
            'feature_cols': [
                'temperature_avg', 'rainfall_mm', 'fertilizer_kg',
                'soil_ph', 'sun_hours', 'humidity_avg',
                'pest_presence', 'disease_presence'
            ],
            'target_col': 'yield_tons_per_ha',
            'lgb_params': {
                'n_estimators': 100,
                'max_depth': 6,
                'num_leaves': 31,
                'learning_rate': 0.05
            },
            'min_samples': 10,
            'generate_sample_if_missing': True
        }
        config = default_config
    
    try:
        result = train_and_export(config)
        sys.exit(0)
    except Exception as e:
        logger.error(f"Training failed: {e}")
        sys.exit(1)