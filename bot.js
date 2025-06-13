require('dotenv').config();
// filepath: c:\Users\Gunmore\Desktop\whatsapp-bot\bot.js
const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const axios = require('axios');
const moment = require('moment');

// === Optional: OpenAI Setup ===
let openai;
try {
    const { Configuration, OpenAIApi } = require('openai');
    const openaiApiKey = process.env.OPENAI_API_KEY || ''; // Set your OpenAI key as env variable
    if (openaiApiKey) {
        const configuration = new Configuration({ apiKey: openaiApiKey });
        openai = new OpenAIApi(configuration);
    }
} catch (e) {
    openai = null;
}

// === Initialize WhatsApp Client ===
const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: { headless: true }
});

// === QR code on first run ===
client.on('qr', qr => {
    console.log('Scan this QR code to log in:');
    qrcode.generate(qr, { small: true });
});

// === Ready ===
client.on('ready', () => {
    console.log('WhatsApp bot is ready ✔');
    console.log('Your WhatsApp ID:', client.info.wid._serialized);
});

// === Error Handling ===
client.on('auth_failure', msg => {
    console.error('Authentication failure:', msg);
});
client.on('disconnected', reason => {
    console.log('Client was logged out:', reason);
});
client.on('error', error => {
    console.error('Error occurred:', error);
});

// === Main Message Handler ===
client.on('message', async message => {
    console.log(`Received message from ${message.from}: ${message.body}`);
    try {
        const chat = await message.getChat();
        const contact = await message.getContact();
        const body = message.body ? message.body.trim() : "";
        const isGroup = chat.isGroup;

        // === Only respond to your WhatsApp ID ===
  const MY_ID = '254705707208@c.us'; 
if (message.from !== MY_ID) {
    return; // Ignore messages not from you
}
console.log('Message is from MY_ID, processing command:', body);

// Typing simulation
await chat.sendStateTyping();

// Command handling
if (/^hello$/i.test(body)) {
    await client.sendMessage(message.from, `Hi ${contact.pushname || contact.number}! 👋`);
}
        else if (/^help$/i.test(body)) {
            await client.sendMessage(message.from,
                `*WhatsApp Bot Commands:*\n- hello\n- time\n- joke\n- ai <your question>\n- img\n- audio\n- doc\n- help\n`
            );
        }
        else if (/^time$/i.test(body)) {
            await client.sendMessage(message.from, `🕒 Current time: ${moment().format('LLLL')}`);
        }
        else if (/^joke$/i.test(body)) {
            try {
                const res = await axios.get('https://v2.jokeapi.dev/joke/Any?type=single');
                await client.sendMessage(message.from, `🤣 ${res.data.joke}`);
            } catch {
                await client.sendMessage(message.from, 'Could not fetch a joke right now.');
            }
        }
        else if (/^ai\s+(.+)/i.test(body) && openai) {
            const prompt = body.replace(/^ai\s+/i, '').trim();
            try {
                const completion = await openai.createChatCompletion({
                    model: 'gpt-3.5-turbo',
                    messages: [
                        { role: 'system', content: 'You are a helpful WhatsApp assistant.' },
                        { role: 'user', content: prompt },
                    ],
                });
                await client.sendMessage(message.from, completion.data.choices[0].message.content.trim());
            } catch (e) {
                await client.sendMessage(message.from, '❌ AI error: ' + e.message);
            }
        }
        else if (/^img$/i.test(body)) {
            // Send an image from URL
            try {
                const url = 'https://placekitten.com/400/400';
                const media = await MessageMedia.fromUrl(url);
                await client.sendMessage(message.from, media, { caption: 'Here is a cute kitten! 🐱' });
            } catch {
                await client.sendMessage(message.from, 'Could not fetch image.');
            }
        }
        else if (/^audio$/i.test(body)) {
            // Send an audio file from a URL
            try {
                const audioUrl = 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3';
                const media = await MessageMedia.fromUrl(audioUrl);
                await client.sendMessage(message.from, media, { sendAudioAsVoice: true });
            } catch {
                await client.sendMessage(message.from, 'Could not fetch audio.');
            }
        }
        else if (/^doc$/i.test(body)) {
            // Send a document from a URL
            try {
                const docUrl = 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf';
                const media = await MessageMedia.fromUrl(docUrl);
                await client.sendMessage(message.from, media, { caption: 'Here is your PDF document.' });
            } catch {
                await client.sendMessage(message.from, 'Could not fetch document.');
            }
        }
        else if (/^groupinfo$/i.test(body) && isGroup) {
            // Group info: only in groups
            await client.sendMessage(message.from,
                `*Group:* ${chat.name}\n` +
                `*Participants:* ${chat.participants.length}\n` +
                `*ID:* ${chat.id.user}`
            );
        }
        else if (/^ping$/i.test(body)) {
            await client.sendMessage(message.from, 'pong!');
        }
        else if (/^fact$/i.test(body)) {
            try {
                const res = await axios.get('https://uselessfacts.jsph.pl/random.json?language=en');
                await client.sendMessage(message.from, `🤓 Fact: ${res.data.text}`);
            } catch {
                await client.sendMessage(message.from, 'Could not fetch a fact.');
            }
        }
        else {
            // Default: for group, don't reply; for DM, offer help
            if (!isGroup) {
                await client.sendMessage(message.from,
                    `👋 Hi! Type *help* to see my commands.\nTry: "ai what is the meaning of life?"`
                );
            }
        }
    } catch (err) {
        console.error('Message handler error:', err);
    }
});

// === Start Client ===
client.initialize();