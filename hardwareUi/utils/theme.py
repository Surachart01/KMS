"""
Theme configuration for the Key Management Desktop App
Clean White-Green palette — optimized for 7-inch RPi touchscreen (800x480)
"""

# Color Palette — White & Green
COLORS = {
    # Background colors (white base)
    "bg_primary": "#f5f9f7",
    "bg_secondary": "#ffffff",
    "bg_card": "#ffffff",
    "bg_hover": "#e8f5e9",

    # Accent colors (green family)
    "accent_primary": "#2e7d32",
    "accent_secondary": "#1b5e20",
    "accent_success": "#43a047",
    "accent_warning": "#ff9800",
    "accent_danger": "#e53935",

    # Text colors (dark for readability on white)
    "text_primary": "#1a1a1a",
    "text_secondary": "#4a5568",
    "text_muted": "#90a4ae",
    "text_white": "#ffffff",

    # Button colors
    "btn_green": "#2e7d32",
    "btn_green_hover": "#388e3c",
    "btn_blue": "#1976d2",
    "btn_blue_hover": "#1e88e5",
    "btn_purple": "#7b1fa2",
    "btn_purple_hover": "#8e24aa",
    "btn_teal": "#00897b",
    "btn_teal_hover": "#00a590",

    # Circle buttons (green shades)
    "circle_1": "#2e7d32",
    "circle_2": "#00897b",
    "circle_3": "#558b2f",

    # Border colors
    "border": "#c8e6c9",
    "border_light": "#e0e0e0",

    # Header / bar
    "header_bg": "#2e7d32",
}

# Font configurations — compact for 7-inch screen
FONTS = {
    "title": ("Helvetica", 22, "bold"),
    "subtitle": ("Helvetica", 15, "bold"),
    "heading": ("Helvetica", 13, "bold"),
    "body": ("Helvetica", 12),
    "body_bold": ("Helvetica", 12, "bold"),
    "small": ("Helvetica", 10),
    "button": ("Helvetica", 12, "bold"),
    "icon": ("Helvetica", 28),
}

# Spacing — tighter for small screen
SPACING = {
    "xs": 2,
    "sm": 4,
    "md": 8,
    "lg": 14,
    "xl": 20,
    "xxl": 30,
}

# Window settings — 7-inch RPi touchscreen
WINDOW = {
    "width": 800,
    "height": 480,
    "min_width": 800,
    "min_height": 480,
}

# Circle button settings — smaller for compact layout
CIRCLE_BUTTON = {
    "size": 100,
    "icon_size": 36,
    "border_width": 2,
}
