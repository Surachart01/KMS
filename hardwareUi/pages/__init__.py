"""
Pages package - factory functions for all UI pages
"""

from .home_page import create_home_page
from .key_list_page import create_key_list_page
from .scan_waiting_page import create_scan_waiting_page
from .confirm_identity_page import create_confirm_identity_page
from .reason_page import create_reason_page
from .success_page import create_success_page

__all__ = [
    "create_home_page",
    "create_key_list_page",
    "create_scan_waiting_page",
    "create_confirm_identity_page",
    "create_reason_page",
    "create_success_page",
]
