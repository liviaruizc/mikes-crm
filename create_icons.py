from PIL import Image, ImageDraw
import os

# Create a simple colored icon based on your logo colors (gold background)
size = 1024
img = Image.new('RGB', (size, size), color='#f59e0b')

# Save the main app icon
output_path = r'c:\Users\Livia\boss-crm\ios\App\App\Assets.xcassets\AppIcon.appiconset\AppIcon-512@2x.png'
img.save(output_path)
print(f"Created app icon: {output_path}")

# Also create a favicon for web
favicon_path = r'c:\Users\Livia\boss-crm\public\favicon.png'
favicon = img.resize((32, 32))
favicon.save(favicon_path)
print(f"Created favicon: {favicon_path}")
