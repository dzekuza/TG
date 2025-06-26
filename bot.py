from pyrogram import Client, filters
from pyrogram.types import Message, InlineKeyboardMarkup, InlineKeyboardButton, WebAppInfo

api_id = 123456     # 🔁 Replace with your real API ID
api_hash = "abc123" # 🔁 Replace with your real API hash
bot_token = "YOUR_BOT_TOKEN"  # 🔁 From @BotFather
webapp_url = "https://yourdomain.com/webapp.html"  # 🔁 Replace with your hosted webapp URL

app = Client("bot", api_id=api_id, api_hash=api_hash, bot_token=bot_token)

@app.on_message(filters.command("start"))
async def start(client, message: Message):
    keyboard = InlineKeyboardMarkup([
        [InlineKeyboardButton("📍 Share Location", web_app=WebAppInfo(url=webapp_url))]
    ])
    await message.reply("Hi! Please share your location to request a ride:", reply_markup=keyboard)

@app.on_message(filters.command("driver"))
async def driver(client, message: Message):
    keyboard = InlineKeyboardMarkup([
        [InlineKeyboardButton("📍 Share Location", web_app=WebAppInfo(url=webapp_url))]
    ])
    await message.reply("New customer request! Please share your location:", reply_markup=keyboard)

app.run()