const { Client, GatewayIntentBits, REST, Routes } = require('discord.js');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.MessageContent
    ]
});

const adminId = '830112709009604661';
const clientId = '1344687765303984212';
const tokenPart1 = 'MTM0NDY4Nzc2NTMwMzk4NDIxMg.GvbZ7q.g';
const tokenPart2 = 'uFTmPeIhapVAHY82S-vliQy46jERAPEE-fAbo';
const botToken = tokenPart1 + tokenPart2;

let tickets = {};

const generateTicketId = () => {
    return Math.floor(1000 + Math.random() * 9000); // Generates a 4-digit number
};

const commands = [
    {
        name: 'support',
        description: 'Submit a support ticket.',
        options: [
            {
                name: 'reason',
                type: 3, // STRING
                description: 'The reason for your support request.',
                required: true,
            }
        ]
    },
    {
        name: 'reply',
        description: 'Reply to a support ticket.',
        options: [
            {
                name: 'ticketid',
                type: 3, // STRING
                description: 'The ID of the ticket.',
                required: true,
            },
            {
                name: 'message',
                type: 3, // STRING
                description: 'Your reply message.',
                required: true,
            }
        ]
    },
    {
        name: 'close',
        description: 'Close a support ticket.',
        options: [
            {
                name: 'ticketid',
                type: 3, // STRING
                description: 'The ID of the ticket.',
                required: true,
            }
        ]
    }
];

client.once('ready', async () => {
    console.log(`Logged in as ${client.user.tag}`);

    const rest = new REST({ version: '10' }).setToken(botToken);

    try {
        console.log('Refreshing slash commands...');
        await rest.put(Routes.applicationCommands(clientId), { body: commands });
        console.log('Successfully reloaded slash commands.');
    } catch (error) {
        console.error(error);
    }
});

client.on('interactionCreate', async interaction => {
    if (!interaction.isCommand()) return;

    const { commandName, options, user } = interaction;

    if (commandName === 'support') {
        const reason = options.getString('reason');
        const ticketId = generateTicketId();
        tickets[ticketId] = { user: user.id, reason, status: 'open' };

        const admin = await client.users.fetch(adminId);
        await admin.send(`New support ticket #${ticketId} from ${user.tag}:\nReason: ${reason}`);
        await user.send(`Your ticket #${ticketId} has been submitted, please be advised an agent may take up to 24h to respond..`);
        await interaction.reply({ content: `Your support ticket has been submitted. Your ticket ID is #${ticketId}.`, ephemeral: true });
    }

    if (commandName === 'reply') {
        const ticketId = options.getString('ticketid');
        const message = options.getString('message');
        const ticket = tickets[ticketId];

        if (!ticket) {
            await interaction.reply({ content: 'Invalid ticket ID.', ephemeral: true });
            return;
        }

        if (user.id !== adminId && user.id !== ticket.user) {
            await interaction.reply({ content: 'You can only reply to your own tickets.', ephemeral: true });
            return;
        }

        if (user.id === adminId) {
            // Admin's message is sent as "Admin (ticketid): Hello"
            const recipient = await client.users.fetch(ticket.user);
            await recipient.send(`Admin (${ticketId}): ${message}`);
        } else {
            // User's message is sent as "username (ticketid): Hello"
            const admin = await client.users.fetch(adminId);
            await admin.send(`${user.tag} (${ticketId}): ${message}`);
        }

        // Send a reply to both the user and the admin with the format
        if (user.id === adminId) {
            await interaction.reply({ content: `Admin (${ticketId}): ${message}`, ephemeral: true });
        } else {
            await interaction.reply({ content: `${user.tag} (${ticketId}): ${message}`, ephemeral: true });
        }
    }

    if (commandName === 'close') {
        const ticketId = options.getString('ticketid');
        const ticket = tickets[ticketId];

        if (!ticket) {
            await interaction.reply({ content: 'Invalid ticket ID.', ephemeral: true });
            return;
        }

        if (user.id === adminId || user.id === ticket.user) {
            ticket.status = 'closed';
            const recipient = await client.users.fetch(ticket.user);
            await recipient.send(`Your ticket #${ticketId} has been closed.`);
            
            // Notify the admin that a ticket was closed
            const admin = await client.users.fetch(adminId);
            await admin.send(`Ticket #${ticketId} has been closed.`);

            await interaction.reply({ content: `Ticket #${ticketId} has been closed.`, ephemeral: true });
        } else {
            await interaction.reply({ content: 'You can only close your own tickets.', ephemeral: true });
        }
    }
});

client.login(botToken);
