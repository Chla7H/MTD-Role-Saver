const { 
    Client, 
    GatewayIntentBits, 
    PermissionFlagsBits, 
    EmbedBuilder, 
    ChannelType, 
    ApplicationCommandOptionType,
    ActivityType,
    REST,
    Routes
} = require('discord.js');
const fs = require('fs');
const config = require('./config.json');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages
    ]
});

// Local JSON Database Setup
const DB_FILE = './database.json';
if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify({ logsChannels: {}, savedRoles: {} }, null, 4));
}

function getDB() { return JSON.parse(fs.readFileSync(DB_FILE)); }
function saveDB(data) { fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 4)); }

const LOGO_URL = "https://i.imgur.com/Xs2BKQN.png";

// Ready Event & Status Configuration
client.once('ready', async () => {
    console.log(`🚀 Mega Team Development® | System initialized as ${client.user.tag}`);
    
    // Configured with purple streaming badge and idle (orange) status dot
    client.user.setPresence({
        activities: [{ 
            name: 'Discord.gg/MEGA', 
            type: ActivityType.Streaming,
            url: 'https://www.twitch.tv/mega_team' // Required by Discord to display the streaming style
        }],
        status: 'idle'
    });

    // Deploy global registration command
    const commands = [
        {
            name: 'setup',
            description: 'Configure the Mega Team Role Saver system',
            default_member_permissions: PermissionFlagsBits.Administrator.toString(),
            options: [
                {
                    name: 'logs',
                    description: 'Automatically generate a dedicated logs channel',
                    type: ApplicationCommandOptionType.Subcommand
                }
            ]
        }
    ];

    const rest = new REST({ version: '10' }).setToken(config.token);
    try {
        await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
        console.log('✅ Mega Team Development® | Slash commands updated successfully.');
    } catch (error) {
        console.error('❌ Error deploying slash commands:', error);
    }
});

// Slash Command Interaction Manager
client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    const { commandName, options, guild } = interaction;
    const db = getDB();

    if (commandName === 'setup') {
        const subcommand = options.getSubcommand();

        if (subcommand === 'logs') {
            await interaction.deferReply({ ephemeral: true });

            try {
                // Auto-create a secured tracking channel
                const logChannel = await guild.channels.create({
                    name: '📦-mega-logs',
                    type: ChannelType.GuildText,
                    permissionOverwrites: [
                        {
                            id: guild.roles.everyone.id,
                            deny: [PermissionFlagsBits.ViewChannel],
                        }
                    ]
                });

                db.logsChannels[guild.id] = logChannel.id;
                saveDB(db);

                const embed = new EmbedBuilder()
                    .setTitle('⚙️ System Logs Configured')
                    .setDescription(`The automated logging channel has been deployed successfully: ${logChannel}`)
                    .setColor('#2b2d31')
                    .setThumbnail(LOGO_URL)
                    .setFooter({ text: 'Mega Team Development®', iconURL: LOGO_URL })
                    .setTimestamp();

                await interaction.editReply({ embeds: [embed] });
            } catch (err) {
                console.error(err);
                await interaction.editReply({ content: "❌ Error: Bot lacks 'Manage Channels' permission to deploy logs automatically." });
            }
        }
    }
});

// Leave Event: Real-Time Hierarchy Verification Shield
client.on('guildMemberRemove', async member => {
    if (member.user.bot) return;

    const db = getDB();
    const guildId = member.guild.id;
    const userId = member.id;

    // Filter out @everyone role
    const roles = member.roles.cache.filter(r => r.id !== member.guild.id).map(r => r.id);

    if (!db.savedRoles[guildId]) db.savedRoles[guildId] = {};

    // DYNAMIC HIERARCHY CHECK: Compares member's highest role position against the bot's highest role position
    const botMember = member.guild.members.me;
    const isHigherThanBot = member.roles.highest.position >= botMember.roles.highest.position;

    db.savedRoles[guildId][userId] = {
        roles: isHigherThanBot ? [] : roles, // If user is above or equal to the bot, clear their saved roles profile completely
        wasHigher: isHigherThanBot
    };
    saveDB(db);

    // Logging Execution
    const logChannelId = db.logsChannels[guildId];
    if (logChannelId) {
        const logChannel = member.guild.channels.cache.get(logChannelId);
        if (logChannel) {
            const embed = new EmbedBuilder()
                .setTitle('📥 Member Left — Role State Processed')
                .setDescription(`**User:** ${member.user.tag} (\`${member.id}\`)\n**Hierarchy Security Check:** ${isHigherThanBot ? '⚠️ **Bypassed & Cleared** (User held a role higher than or equal to the bot. No roles saved.)' : `Successfully backed up **${roles.length}** roles.`}`)
                .setColor(isHigherThanBot ? '#ff4d4d' : '#2b2d31')
                .setThumbnail(LOGO_URL)
                .setFooter({ text: 'Mega Team Development®', iconURL: LOGO_URL })
                .setTimestamp();
            
            logChannel.send({ embeds: [embed] }).catch(() => {});
        }
    }
});

// Join Event: Role Reconstruction & Bypass Block
client.on('guildMemberAdd', async member => {
    if (member.user.bot) return;

    const db = getDB();
    const guildId = member.guild.id;
    const userId = member.id;

    if (!db.savedRoles[guildId] || !db.savedRoles[guildId][userId]) return;

    const userData = db.savedRoles[guildId][userId];
    const logChannelId = db.logsChannels[guildId];
    const logChannel = logChannelId ? member.guild.channels.cache.get(logChannelId) : null;

    // Reject restoration if user tripped the hierarchy protection system
    if (userData.wasHigher) {
        if (logChannel) {
            const embed = new EmbedBuilder()
                .setTitle('🛡️ Security Bypass Notice')
                .setDescription(`**User:** ${member.user} (\`${member.id}\`)\n**Action:** Automatic restoration skipped. This user holds a rank **above or equal to the bot's hierarchy** level. Roles must be managed manually by server owners.`)
                .setColor('#ffaa00')
                .setThumbnail(LOGO_URL)
                .setFooter({ text: 'Mega Team Development®', iconURL: LOGO_URL })
                .setTimestamp();
            logChannel.send({ embeds: [embed] }).catch(() => {});
        }
        return;
    }

    // Process standard user role restoration
    if (userData.roles && userData.roles.length > 0) {
        const rolesToAdd = [];
        for (const roleId of userData.roles) {
            const role = member.guild.roles.cache.get(roleId);
            // Verify bot can actually modify the role
            if (role && role.editable) {
                rolesToAdd.push(role);
            }
        }

        if (rolesToAdd.length > 0) {
            await member.roles.add(rolesToAdd).catch(console.error);

            if (logChannel) {
                const embed = new EmbedBuilder()
                    .setTitle('🔄 Roles Restored Successfully')
                    .setDescription(`**User:** ${member.user} (\`${member.id}\`)\n**Restored Roles:** ${rolesToAdd.map(r => r.toString()).join(', ')}`)
                    .setColor('#2b2d31')
                    .setThumbnail(LOGO_URL)
                    .setFooter({ text: 'Mega Team Development®', iconURL: LOGO_URL })
                    .setTimestamp();
                logChannel.send({ embeds: [embed] }).catch(() => {});
            }
        }
    }
});

client.login(config.token);