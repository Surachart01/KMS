"""
Theme configuration for the Key Management Desktop App
Modern color palette and styling constants
"""

# Color Palette - Modern Dark Theme with Blue Accents
COLORS = {
    # Background colors
    "bg_primary": "#0f0f1a",
    "bg_secondary": "#1a1a2e",
    "bg_card": "#16213e",
    "bg_hover": "#1f3460",
    
    # Accent colors
    "accent_primary": "#4361ee",
    "accent_secondary": "#3f37c9",
    "accent_success": "#06d6a0",
    "accent_warning": "#ffd60a",
    "accent_danger": "#ef476f",
    
    # Text colors
    "text_primary": "#ffffff",
    "text_secondary": "#a8b2d1",
    "text_muted": "#6c7a96",
    
    # Button colors
    "btn_blue": "#4361ee",
    "btn_blue_hover": "#5a7af5",
    "btn_purple": "#7209b7",
    "btn_purple_hover": "#9b2de0",
    "btn_teal": "#06d6a0",
    "btn_teal_hover": "#0ef5b8",
    
    # Gradient colors for circles
    "circle_1": "#4361ee",
    "circle_2": "#7209b7", 
    "circle_3": "#06d6a0",
    
    # Border colors
    "border": "#2a3f5f",
    "border_light": "#3d5a80",
}

# Font configurations
FONTS = {
    "title": ("Helvetica", 28, "bold"),
    "subtitle": ("Helvetica", 18, "bold"),
    "heading": ("Helvetica", 16, "bold"),
    "body": ("Helvetica", 14),
    "body_bold": ("Helvetica", 14, "bold"),
    "small": ("Helvetica", 12),
    "button": ("Helvetica", 14, "bold"),
    "icon": ("Helvetica", 32),
}

# Spacing
SPACING = {
    "xs": 4,
    "sm": 8,
    "md": 16,
    "lg": 24,
    "xl": 32,
    "xxl": 48,
}

# Window settings
WINDOW = {
    "width": 900,
    "height": 650,
    "min_width": 800,
    "min_height": 600,
}

# Circle button settings
CIRCLE_BUTTON = {
    "size": 140,
    "icon_size": 48,
    "border_width": 3,
}
