from pyrogram import Client, filters
from pyrogram.types import Message, InlineKeyboardMarkup, InlineKeyboardButton, WebAppInfo, ReplyKeyboardMarkup, KeyboardButton

# === CONFIG ===
api_id = 20680035
api_hash = "822c839dffec0d61077103bd0e643f37"
bot_token = "8166370256:AAHMzFBpGP1ZNZ48b2U-aYixVv1xULQUKWE"
webapp_url = "https://tg-gamma-ten.vercel.app"  # ✅ Use root domain

app = Client("bot", api_id=api_id, api_hash=api_hash, bot_token=bot_token)

# === /start command ===
@app.on_message(filters.command("start"))
async def start(client, message: Message):
    keyboard = InlineKeyboardMarkup([
        [InlineKeyboardButton("🍔 Order Food", web_app=WebAppInfo(url=webapp_url))]
    ])
    await message.reply("Hi! Tap below to order your food:", reply_markup=keyboard)

# === /driver command ===
@app.on_message(filters.command("driver"))
async def driver(client, message: Message):
    keyboard = InlineKeyboardMarkup([
        [InlineKeyboardButton("📍 Open Location Sharing", web_app=WebAppInfo(url=webapp_url))]
    ])
    await message.reply("Driver panel: tap to open your location sharing view.", reply_markup=keyboard)

# === /location command (native Telegram location) ===
@app.on_message(filters.command("location"))
async def ask_location(client, message: Message):
    reply_markup = ReplyKeyboardMarkup(
        [[KeyboardButton("📍 Share my live location", request_location=True)]],
        resize_keyboard=True,
        one_time_keyboard=True
    )
    await message.reply("Please tap the button below to share your live location:", reply_markup=reply_markup)

# === Handle location message ===
@app.on_message(filters.location)
async def handle_location(client, message: Message):
    lat = message.location.latitude
    lng = message.location.longitude
    chat_id = message.chat.id
    print(f"📍 Received location from {chat_id}: {lat}, {lng}")

    await message.reply("✅ Location received! Thank you.")

app.run()
