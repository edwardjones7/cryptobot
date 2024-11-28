import discord
import openai
import requests
from discord.ext import commands
import asyncio
import platform

# Directly defining the tokens
DISCORD_BOT_TOKEN = " "
OPENAI_API_KEY = " "

# Print the token for debugging purposes
print(f"DISCORD_BOT_TOKEN: {DISCORD_BOT_TOKEN}")

if platform.system() == "Windows":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

# Set intents
intents = discord.Intents.default()
intents.messages = True
intents.message_content = True

# Initialize the bot
bot = commands.Bot(command_prefix="!", intents=intents)

# Keywords
keyword = ["top gainers"]

# OpenAI API Key
openai.api_key = OPENAI_API_KEY

# Define bot events and commands **after** the bot is initialized
@bot.event
async def on_ready():
    print(f"We have logged in as {bot.user}")

@bot.command()
async def ask(ctx, *, question: str):
    """
    Respond to a user query using OpenAI's GPT API with integrated CoinGecko data.
    """
    try:
        # Check if the question is about top gainers or crypto updates
        if any(keyword in question.lower() for keyword in ["top gainers", "crypto updates", "cryptocurrency", "blockchain", "bitcoin", "ethereum", "market trends", "altcoins", "price changes"]):
            # Fetch top gainers data from CoinGecko API
            response = requests.get("https://api.coingecko.com/api/v3/coins/markets", params={
                "vs_currency": "usd",
                "order": "percent_change_24h_desc",
                "per_page": 10,
                "page": 1,
                "sparkline": "false"
            })
            data = response.json()

            # Format the response
            top_gainers = "\n".join([f"{coin['name']} ({coin['symbol']}): +{coin['price_change_percentage_24h']:.2f}%"
                                     for coin in data])

            # Include the top gainers information in the system message
            system_message_content = f"Here are the top cryptocurrency gainers today: {top_gainers}"
        else:
            system_message_content = (
                "You are cryptobot, a highly knowledgeable cryptocurrency expert with a decade of experience in blockchain technology, "
                "crypto trading, and decentralized finance. You provide clear, concise, and friendly advice on cryptocurrencies, market trends, "
                "and technical topics. Your tone is professional yet approachable, and you transparency, strategic planning, and fostering a deep understanding of the crypto landscape."
            )

        # Define the persona for OpenAI's Chat API
        system_message = {
            "role": "system",
            "content": system_message_content
        }

        # Send the question to OpenAI's API
        response = openai.ChatCompletion.create(
            model="gpt-4",
            messages=[system_message, {"role": "user", "content": question}],
            max_tokens=200
        )
        # Extract and send the bot's response
        answer = response['choices'][0]['message']['content']
        await ctx.send(answer)
    except Exception as e:
        await ctx.send("Sorry, something went wrong. 🛠️")
        print(e)

# Run the bot
bot.run(DISCORD_BOT_TOKEN)
