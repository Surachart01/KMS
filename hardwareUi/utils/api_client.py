"""
API Client for Key Management System
Handles authenticated requests to the backend
"""

import os
import requests
import logging
from datetime import datetime
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s [%(levelname)s] %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
logger = logging.getLogger(__name__)

class APIClient:
    """Client for making authenticated API requests"""
    
    def __init__(self):
        self.base_url = os.getenv("API_BASE_URL", "http://172.20.10.5/api/hardware")
        self.token = os.getenv("API_TOKEN", "")
    
    def _get_headers(self):
        """Get headers with Bearer token authentication"""
        return {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json",
            "Accept": "application/json"
        }
    
    def get_keys(self):
        """
        Fetch all keys from the backend
        Returns: tuple (success: bool, data: list or error: str)
        """
        url = f"{self.base_url}/keys"
        headers = self._get_headers()
        
        # Log request details
        logger.info("=" * 50)
        logger.info("🔄 API REQUEST")
        logger.info(f"URL: {url}")
        logger.info(f"Method: GET")
        logger.info(f"Headers:")
        for key, value in headers.items():
            # Mask the token for security (show first 10 chars only)
            if key == "Authorization" and len(value) > 20:
                logger.info(f"  {key}: {value[:17]}...")
            else:
                logger.info(f"  {key}: {value}")
        logger.info("-" * 50)
        
        try:
            response = requests.get(
                url,
                headers=headers,
                timeout=10
            )
            
            # Log response details
            logger.info("📥 API RESPONSE")
            logger.info(f"Status Code: {response.status_code}")
            logger.info(f"Response Headers:")
            for key, value in response.headers.items():
                logger.info(f"  {key}: {value}")
            logger.info(f"Response Body: {response.text[:500]}..." if len(response.text) > 500 else f"Response Body: {response.text}")
            logger.info("=" * 50)
            
            if response.status_code == 200:
                return True, response.json()
            elif response.status_code == 401:
                return False, "Unauthorized: Please check your API token"
            elif response.status_code == 403:
                return False, "Forbidden: Access denied"
            else:
                return False, f"Error: {response.status_code} - {response.text}"
                
        except requests.exceptions.ConnectionError as e:
            logger.error(f"❌ Connection Error: {str(e)}")
            return False, "Connection Error: Unable to reach the server"
        except requests.exceptions.Timeout as e:
            logger.error(f"❌ Timeout Error: {str(e)}")
            return False, "Timeout: Server took too long to respond"
        except requests.exceptions.RequestException as e:
            logger.error(f"❌ Request Error: {str(e)}")
            return False, f"Request Error: {str(e)}"
    
    def is_configured(self):
        """Check if the API client is properly configured"""
        return bool(self.token and self.token != "your_bearer_token_here")


    def borrow_key(self, student_code, room_code, reason=None):
        """
        Borrow a key (Create booking)
        Args:
            student_code (str): Student ID
            room_code (str): Room code to borrow
            reason (str, optional): Reason for borrowing if no auth
        Returns: tuple (success: bool, data: dict or error: str)
        """
        url = f"{self.base_url}/borrow"
        headers = self._get_headers()
        payload = {
            "studentCode": student_code,
            "roomCode": room_code
        }
        if reason:
            payload["reason"] = reason
        
        logger.info("=" * 50)
        logger.info("🔄 API REQUEST (BORROW)")
        logger.info(f"URL: {url}")
        logger.info(f"Payload: {payload}")
        
        try:
            response = requests.post(
                url,
                json=payload,
                headers=headers,
                timeout=10
            )
            
            logger.info(f"📥 API RESPONSE: {response.status_code}")
            
            if response.status_code in (200, 201):
                return True, response.json()
            else:
                try:
                    error_data = response.json()
                    # Return the whole dict, not just a string
                    return False, error_data
                except:
                    return False, response.text
                
        except Exception as e:
            logger.error(f"❌ Request Error: {str(e)}")
            return False, str(e)

    def return_key(self, student_code):
        """
        Return a key
        Args:
            student_code (str): Student ID
        Returns: tuple (success: bool, data: dict or error: str)
        """
        url = f"{self.base_url}/return"
        headers = self._get_headers()
        payload = {
            "studentCode": student_code
        }
        
        logger.info("=" * 50)
        logger.info("🔄 API REQUEST (RETURN)")
        logger.info(f"URL: {url}")
        logger.info(f"Payload: {payload}")
        
        try:
            response = requests.post(
                url,
                json=payload,
                headers=headers,
                timeout=10
            )
            
            logger.info(f"📥 API RESPONSE: {response.status_code}")
            
            if response.status_code == 200:
                return True, response.json()
            else:
                try:
                    error_data = response.json()
                    # Return the whole dict, not just a string
                    return False, error_data
                except:
                    return False, response.text
                
        except Exception as e:
            logger.error(f"❌ Request Error: {str(e)}")
            return False, str(e)


# Singleton instance
api_client = APIClient()
