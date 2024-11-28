import dotenv from 'dotenv';
dotenv.config();
import { Client, GatewayIntentBits, REST, Routes } from 'discord.js';
import axios from 'axios';

// Set up the bot client
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildPresences,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});



async function registerCommands() {
    const commands = [
        {
            name: 'cryptoai',
            description: 'Ask a cryptocurrency-related question.',
            type: 1, // 1 indicates a chat command
            options: [
                {
                    name: 'question',
                    description: 'Your question about cryptocurrency',
                    type: 3, // STRING type (3 corresponds to STRING)
                    required: true
                }
            ]
        }
    ];

    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

    try {
        console.log('Started refreshing application (/) commands.');

        await rest.put(
            Routes.applicationCommands(client.user.id),
            { body: commands }
        );

        console.log('Successfully reloaded application (/) commands.');
    } catch (error) {
        console.error(error);
    }
}

let runOnce = 0;

async function getPrices() {
    try {
        const response = await axios.get("https://api.coingecko.com/api/v3/coins/markets", {
            params: {
                vs_currency: process.env.PREFERRED_CURRENCY,
                ids: process.env.COIN_ID,
                price_change_percentage: '1h,24h,7d,30d'
            },
            headers: {
                'Accept': 'application/json',
                'User-Agent': 'XRP Price Tracking Bot'
            }
        });

        const data = response.data[0];
        if (!data) throw new Error('No price data received');

        const currentPrice = data.current_price;
        const priceChange = data.price_change_percentage_24h;
        const priceChange1h = data.price_change_percentage_1h_in_currency;
        const priceChange7d = data.price_change_percentage_7d_in_currency;
        const marketCap = data.market_cap;

        // Update bot status
        await client.user.setPresence({
            activities: [{
                name: `XRP: $${currentPrice} (${priceChange >= 0 ? '+' : ''}${priceChange.toFixed(2)}%)`,
                type: 3
            }],
            status: 'online'
        });

        // Update nickname in all servers
        client.guilds.cache.forEach(async (guild) => {
            try {
                await guild.members.me.setNickname(`cryptobot`);
            } catch (err) {
                console.error(`Failed to update nickname in ${guild.name}:`, err);
            }
        });

        console.log(`Updated XRP price to $${currentPrice} | ${new Date().toLocaleString()}`);

    } catch (error) {
        console.error('Error fetching price:', error);
    }
}

client.on('ready', async () => {
    console.log(`Logged in as ${client.user.tag}`);
    
    // Register commands after the bot is ready
    await registerCommands();

    // Initial price update
    await getPrices();
    
    // Update prices every minute
    setInterval(getPrices, 20000);
});

client.on('interactionCreate', async (interaction) => {
    if (!interaction.isCommand()) return;

    const { commandName, options } = interaction;

    if (commandName === 'cryptoai') {
        const userQuestion = options.getString('question');

        // Generate AI response using GPT-3.5
        try {
            const response = await openai.chat.completions.create({
                model: 'gpt-3.5-turbo',  // Use GPT-3.5 model
                messages: [
                    {
                        role: 'system', 
                        content: 'You are a cryptocurrency expert AI.'
                    },
                    {
                        role: 'user', 
                        content: userQuestion
                    }
                ],
                max_tokens: 150
            });

            const aiResponse = response.choices[0].message.content.trim();
            await interaction.reply(aiResponse);
        } catch (error) {
            console.error('Error generating AI response:', error);
            await interaction.reply('Sorry, I encountered an error while trying to generate a response.');
        }
    }
});


client.on('error', error => {
    console.error('Discord client error:', error);
});

process.on('unhandledRejection', error => {
    console.error('Unhandled promise rejection:', error);
});

client.login(process.env.DISCORD_TOKEN).catch(err => {
    console.error('Failed to login:', err);
});
