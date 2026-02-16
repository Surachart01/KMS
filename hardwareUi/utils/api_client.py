"""
API Client for Key Management System
Module-level functions for authenticated requests to the backend.
"""

import os
import requests
import logging
from dotenv import load_dotenv

load_dotenv()

logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s [%(levelname)s] %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
logger = logging.getLogger(__name__)

# Module-level config
_base_url = os.getenv("API_BASE_URL", "http://172.20.10.5/api/hardware")
_token = os.getenv("API_TOKEN", "")


def _get_headers():
    """Get headers with Bearer token authentication"""
    return {
        "Authorization": f"Bearer {_token}",
        "Content-Type": "application/json",
        "Accept": "application/json",
    }


def is_configured():
    """Check if the API client is properly configured"""
    return bool(_token and _token != "your_bearer_token_here")


def get_keys():
    """
    Fetch all keys from the backend.
    Returns: tuple (success: bool, data: list | error: str)
    """
    url = f"{_base_url}/keys"
    headers = _get_headers()

    logger.info("=" * 50)
    logger.info("🔄 API REQUEST")
    logger.info(f"URL: {url}")
    logger.info("Method: GET")
    logger.info("Headers:")
    for key, value in headers.items():
        if key == "Authorization" and len(value) > 20:
            logger.info(f"  {key}: {value[:17]}...")
        else:
            logger.info(f"  {key}: {value}")
    logger.info("-" * 50)

    try:
        response = requests.get(url, headers=headers, timeout=10)

        logger.info("📥 API RESPONSE")
        logger.info(f"Status Code: {response.status_code}")
        logger.info("Response Headers:")
        for key, value in response.headers.items():
            logger.info(f"  {key}: {value}")
        body_preview = response.text[:500] + "..." if len(response.text) > 500 else response.text
        logger.info(f"Response Body: {body_preview}")
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
        logger.error(f"❌ Connection Error: {e}")
        return False, "Connection Error: Unable to reach the server"
    except requests.exceptions.Timeout as e:
        logger.error(f"❌ Timeout Error: {e}")
        return False, "Timeout: Server took too long to respond"
    except requests.exceptions.RequestException as e:
        logger.error(f"❌ Request Error: {e}")
        return False, f"Request Error: {e}"


def borrow_key(student_code, room_code, reason=None):
    """
    Borrow a key (create booking).
    Returns: tuple (success: bool, data: dict | error: dict/str)
    """
    url = f"{_base_url}/borrow"
    headers = _get_headers()
    payload = {"studentCode": student_code, "roomCode": room_code}
    if reason:
        payload["reason"] = reason

    logger.info("=" * 50)
    logger.info("🔄 API REQUEST (BORROW)")
    logger.info(f"URL: {url}")
    logger.info(f"Payload: {payload}")

    try:
        response = requests.post(url, json=payload, headers=headers, timeout=10)
        logger.info(f"📥 API RESPONSE: {response.status_code}")

        if response.status_code in (200, 201):
            return True, response.json()
        else:
            try:
                return False, response.json()
            except Exception:
                return False, response.text

    except Exception as e:
        logger.error(f"❌ Request Error: {e}")
        return False, str(e)


def return_key(student_code):
    """
    Return a key.
    Returns: tuple (success: bool, data: dict | error: dict/str)
    """
    url = f"{_base_url}/return"
    headers = _get_headers()
    payload = {"studentCode": student_code}

    logger.info("=" * 50)
    logger.info("🔄 API REQUEST (RETURN)")
    logger.info(f"URL: {url}")
    logger.info(f"Payload: {payload}")

    try:
        response = requests.post(url, json=payload, headers=headers, timeout=10)
        logger.info(f"📥 API RESPONSE: {response.status_code}")

        if response.status_code == 200:
            return True, response.json()
        else:
            try:
                return False, response.json()
            except Exception:
                return False, response.text

    except Exception as e:
        logger.error(f"❌ Request Error: {e}")
        return False, str(e)
