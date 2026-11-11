from PIL import Image, ImageDraw, ImageFont

# Create a clean screenshot-like image simulating product reviews
width, height = 750, 420
image = Image.new("RGB", (width, height), color=(255, 255, 255))
draw = ImageDraw.Draw(image)

# Draw simulated review card borders and text
# Review 1
draw.rectangle([(20, 20), (730, 130)], outline=(226, 232, 240), width=2)
draw.text((40, 40), "Customer Review 1:", fill=(100, 116, 139))
draw.text((40, 70), "This laptop stand is absolutely fantastic and super sturdy!", fill=(15, 23, 42))

# Review 2
draw.rectangle([(20, 150), (730, 260)], outline=(226, 232, 240), width=2)
draw.text((40, 170), "Customer Review 2:", fill=(100, 116, 139))
draw.text((40, 200), "Horrible experience. The package was damaged and never arrived.", fill=(15, 23, 42))

# Review 3
draw.rectangle([(20, 280), (730, 390)], outline=(226, 232, 240), width=2)
draw.text((40, 300), "Customer Review 3:", fill=(100, 116, 139))
draw.text((40, 330), "The dimensions are 12 inches by 8 inches as described.", fill=(15, 23, 42))

image.save("sentivision/data/test_screenshot.png")
print("Generated test screenshot successfully at sentivision/data/test_screenshot.png")
