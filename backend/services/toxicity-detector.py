#!/usr/bin/env python3
"""
Toxicity Detection Service using Detoxify
Provides toxic content detection for spam and harmful content filtering
"""

import sys
import json
import logging
from detoxify import Detoxify
import argparse

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class ToxicityDetector:
    def __init__(self, model_name='original'):
        """
        Initialize Detoxify model
        Available models: 'original', 'unbiased', 'multilingual'
        """
        try:
            logger.info(f"Loading Detoxify model: {model_name}")
            self.model = Detoxify(model_name)
            logger.info("Detoxify model loaded successfully")
        except Exception as e:
            logger.error(f"Failed to load Detoxify model: {e}")
            raise

    def detect_toxicity(self, text):
        """
        Analyze text for various types of toxicity
        
        Returns:
        {
            'toxicity': float,
            'severe_toxicity': float,
            'obscene': float,
            'threat': float,
            'insult': float,
            'identity_attack': float,
            'is_toxic': bool,
            'max_score': float,
            'toxic_type': str
        }
        """
        try:
            if not text or not text.strip():
                return {
                    'toxicity': 0.0,
                    'severe_toxicity': 0.0,
                    'obscene': 0.0,
                    'threat': 0.0,
                    'insult': 0.0,
                    'identity_attack': 0.0,
                    'is_toxic': False,
                    'max_score': 0.0,
                    'toxic_type': 'none',
                    'confidence': 0.0
                }

            # Get toxicity scores
            scores = self.model.predict(text)
            
            # Convert numpy types to Python types for JSON serialization
            result = {}
            for key, value in scores.items():
                if hasattr(value, 'item'):  # numpy scalar
                    result[key] = float(value.item())
                else:
                    result[key] = float(value)
            
            # Determine overall toxicity
            toxicity_threshold = 0.3  # Adjustable threshold
            max_score = max(result.values())
            
            # Find the most problematic category
            toxic_type = 'none'
            if max_score > toxicity_threshold:
                toxic_type = max(result.items(), key=lambda x: x[1])[0]
            
            result.update({
                'is_toxic': max_score > toxicity_threshold,
                'max_score': max_score,
                'toxic_type': toxic_type,
                'confidence': max_score
            })
            
            return result
            
        except Exception as e:
            logger.error(f"Error detecting toxicity: {e}")
            return {
                'error': str(e),
                'is_toxic': False,
                'confidence': 0.0
            }

    def batch_detect(self, texts):
        """
        Analyze multiple texts for toxicity
        """
        results = []
        for text in texts:
            result = self.detect_toxicity(text)
            results.append(result)
        return results

def main():
    parser = argparse.ArgumentParser(description='Toxicity Detection Service')
    parser.add_argument('--text', type=str, help='Text to analyze')
    parser.add_argument('--batch', action='store_true', help='Process multiple texts from stdin')
    parser.add_argument('--model', type=str, default='original', 
                       choices=['original', 'unbiased', 'multilingual'],
                       help='Detoxify model to use')
    
    args = parser.parse_args()
    
    try:
        detector = ToxicityDetector(args.model)
        
        if args.batch:
            # Process batch input from stdin
            input_data = json.loads(sys.stdin.read())
            if isinstance(input_data, list):
                results = detector.batch_detect(input_data)
            else:
                results = [detector.detect_toxicity(input_data.get('text', ''))]
            
            print(json.dumps(results, ensure_ascii=False, indent=2))
            
        elif args.text:
            # Process single text
            result = detector.detect_toxicity(args.text)
            print(json.dumps(result, ensure_ascii=False, indent=2))
            
        else:
            # Interactive mode - read from stdin
            input_data = json.loads(sys.stdin.read())
            text = input_data.get('text', '') if isinstance(input_data, dict) else str(input_data)
            result = detector.detect_toxicity(text)
            print(json.dumps(result, ensure_ascii=False))
            
    except Exception as e:
        error_result = {
            'error': str(e),
            'is_toxic': False,
            'confidence': 0.0
        }
        print(json.dumps(error_result, ensure_ascii=False))
        sys.exit(1)

if __name__ == '__main__':
    main()