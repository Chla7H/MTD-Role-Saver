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

// Local JSON Storage Engine Initialization
const DB_FILE = './database.json';
if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify({ logsChannels: {}, savedRoles: {}, memberRoles: {}, botRoles: {}, adminPlaceholders: {} }, null, 4));
}

function getDB() { return JSON.parse(fs.readFileSync(DB_FILE)); }
function saveDB(data) { fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 4)); }

const LOGO_URL = "https://i.imgur.com/Xs2BKQN.png";

// Ready Event Hook & Streaming Presence Definition
client.once('ready', async () => {
    console.log(`🚀 Mega Team Development® | Master Client Active as ${client.user.tag}`);
    
    // Configured for a constant purple streaming status badge
    client.user.setPresence({
        activities: [{ 
            name: 'Discord.gg/MEGA', 
            type: ActivityType.Streaming,
            url: 'https://www.twitch.tv/mega_team' // Streaming type requires a valid link format to trigger the purple icon
        }],
        status: 'online'
    });

    // Deploy Application Slash Commands Layout
    const commands = [
        {
            name: 'setup',
            description: 'Configure Mega Team Automation Framework Modules',
            default_member_permissions: PermissionFlagsBits.Administrator.toString(),
            options: [
                {
                    name: 'logs',
                    description: 'Deploy the automated state-tracking log stream',
                    type: ApplicationCommandOptionType.Subcommand
                },
                {
                    name: 'autoroles',
                    description: 'Link automatic custom entry tags for newcomers',
                    type: ApplicationCommandOptionType.Subcommand,
                    options: [
                        {
                            name: 'member-role',
                            description: 'Target role assigned automatically to arriving human members',
                            type: ApplicationCommandOptionType.Role,
                            required: true
                        },
                        {
                            name: 'bot-role',
                            description: 'Target role assigned automatically to arriving verified bots',
                            type: ApplicationCommandOptionType.Role,
                            required: true
                        }
                    ]
                },
                {
                    name: 'admin-placeholder',
                    description: 'Designate the structural cosmetic marker given to returning operators',
                    type: ApplicationCommandOptionType.Subcommand,
                    options: [
                        {
                            name: 'role',
                            description: 'The blank name or decorative role assigned to historically verified admins',
                            type: ApplicationCommandOptionType.Role,
                            required: true
                        }
                    ]
                }
            ]
        },
        {
            name: 'give-role',
            description: 'Mass server modification and distribution engine',
            default_member_permissions: PermissionFlagsBits.Administrator.toString(),
            options: [
                {
                    name: 'all',
                    description: 'Distribute a chosen role to all active guild accounts securely',
                    type: ApplicationCommandOptionType.Subcommand,
                    options: [
                        {
                            name: 'role',
                            description: 'Target role for global distribution',
                            type: ApplicationCommandOptionType.Role,
                            required: true
                        }
                    ]
                }
            ]
        }
    ];

    const rest = new REST({ version: '10' }).setToken(config.token);
    try {
        await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
        console.log('✅ Mega Team Development® | Synchronized all core global commands successfully.');
    } catch (error) {
        console.error('❌ Failed to register execution layout:', error);
    }
});

// Slash Interaction Router Interface
client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    const { commandName, options, guild } = interaction;
    const db = getDB();

    if (commandName === 'setup') {
        const subcommand = options.getSubcommand();

        if (subcommand === 'logs') {
            await interaction.deferReply({ ephemeral: true });
            try {
                const logChannel = await guild.channels.create({
                    name: '📦-mega-logs',
                    type: ChannelType.GuildText,
                    permissionOverwrites: [{ id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] }]
                });
                db.logsChannels[guild.id] = logChannel.id;
                saveDB(db);

                const embed = new EmbedBuilder()
                    .setTitle('⚙️ System Registry Deployed')
                    .setDescription(`Automated cryptographic logging streams bound to text module: ${logChannel}`)
                    .setColor('#2b2d31').setThumbnail(LOGO_URL)
                    .setFooter({ text: 'Mega Team Development®', iconURL: LOGO_URL }).setTimestamp();
                await interaction.editReply({ embeds: [embed] });
            } catch (err) {
                await interaction.editReply({ content: "❌ Permission Fault: Client cannot dynamically provision secure tracking layers." });
            }
        }

        if (subcommand === 'autoroles') {
            const memberRole = options.getRole('member-role');
            const botRole = options.getRole('bot-role');

            db.memberRoles[guild.id] = memberRole.id;
            db.botRoles[guild.id] = botRole.id;
            saveDB(db);

            const embed = new EmbedBuilder()
                .setTitle('⚙️ Gatekeepers Provisioned')
                .setDescription(`**Human Accounts:** ${memberRole}\n**Automated Bots:** ${botRole}`)
                .setColor('#2b2d31').setThumbnail(LOGO_URL)
                .setFooter({ text: 'Mega Team Development®', iconURL: LOGO_URL }).setTimestamp();
            await interaction.reply({ embeds: [embed], ephemeral: true });
        }

        if (subcommand === 'admin-placeholder') {
            const role = options.getRole('role');
            db.adminPlaceholders[guild.id] = role.id;
            saveDB(db);

            const embed = new EmbedBuilder()
                .setTitle('⚙️ Security Marker Initialized')
                .setDescription(`Historical operators holding Administrator attributes will receive the following aesthetic marker upon re-entry: ${role}`)
                .setColor('#2b2d31').setThumbnail(LOGO_URL)
                .setFooter({ text: 'Mega Team Development®', iconURL: LOGO_URL }).setTimestamp();
            await interaction.reply({ embeds: [embed], ephemeral: true });
        }
    }

    if (commandName === 'give-role') {
        if (options.getSubcommand() === 'all') {
            const role = options.getRole('role');
            await interaction.reply({ content: `⏳ Compiling guild database maps. Spreading ${role} down the network chain...`, ephemeral: true });

            try {
                const members = await guild.members.fetch();
                let assignedCount = 0;

                for (const [id, member] of members) {
                    if (!member.roles.cache.has(role.id) && role.editable) {
                        await member.roles.add(role).catch(() => {});
                        assignedCount++;
                    }
                }
                await interaction.followUp({ content: `✅ Network Sync Completed! Safely modified **${assignedCount}** user entities.`, ephemeral: true });
            } catch (err) {
                console.error(err);
                await interaction.followUp({ content: "❌ Data Stream Corrupted: Critical abort during mass iteration routine.", ephemeral: true });
            }
        }
    }
});

// Live Role Sync Module (Keeps roles accurately backed up in real-time)
client.on('guildMemberUpdate', async (oldMember, newMember) => {
    if (newMember.user.bot) return;

    const guildId = newMember.guild.id;
    const userId = newMember.id;
    const db = getDB();

    if (!db.savedRoles[guildId]) db.savedRoles[guildId] = {};

    let administratorPrivilegeDetected = false;
    const safeBackupStack = [];

    newMember.roles.cache.forEach(role => {
        if (role.id === guildId) return; // Skip @everyone
        if (role.permissions.has(PermissionFlagsBits.Administrator)) {
            administratorPrivilegeDetected = true;
        } else {
            safeBackupStack.push(role.id); // All safe roles are preserved perfectly
        }
    });

    db.savedRoles[guildId][userId] = {
        roles: safeBackupStack,
        wasAdmin: administratorPrivilegeDetected
    };
    saveDB(db);
});

// Offboarding Phase: Capture persistent real-time snapshot data on departure
client.on('guildMemberRemove', async member => {
    if (member.user.bot) return;

    const db = getDB();
    const guildId = member.guild.id;
    const userId = member.id;

    let record = db.savedRoles[guildId]?.[userId];
    
    // Emergency live fallback if record cache is empty
    if (!record) {
        let administratorPrivilegeDetected = false;
        const safeBackupStack = [];
        member.roles.cache.forEach(role => {
            if (role.id === guildId) return;
            if (role.permissions.has(PermissionFlagsBits.Administrator)) administratorPrivilegeDetected = true;
            else safeBackupStack.push(role.id);
        });
        if (!db.savedRoles[guildId]) db.savedRoles[guildId] = {};
        db.savedRoles[guildId][userId] = { roles: safeBackupStack, wasAdmin: administratorPrivilegeDetected };
        saveDB(db);
        record = db.savedRoles[guildId][userId];
    }

    const logChannelId = db.logsChannels[guildId];
    if (logChannelId) {
        const logChannel = member.guild.channels.cache.get(logChannelId);
        if (logChannel) {
            const embed = new EmbedBuilder()
                .setTitle('📥 State Preserved — User Session Ended')
                .setDescription(`**User Element:** ${member.user.tag}\n**Saved Parameters:** Cataloged **${record.roles.length}** normal roles safely.\n**Admin Isolation Status:** ${record.wasAdmin ? '⚠️ MODIFIED (Dangerous administrative roles stripped and prepared for replacement)' : 'Safe / Clean Profile'}`)
                .setColor(record.wasAdmin ? '#ffaa00' : '#2b2d31').setThumbnail(LOGO_URL)
                .setFooter({ text: 'Mega Team Development®', iconURL: LOGO_URL }).setTimestamp();
            logChannel.send({ embeds: [embed] }).catch(() => {});
        }
    }
});

// Onboarding Phase: 10-Second Delay Allocation & Custom Recovery Engine
client.on('guildMemberAdd', async member => {
    const guildId = member.guild.id;
    const db = getDB();
    
    const logChannelId = db.logsChannels[guildId];
    const logChannel = logChannelId ? member.guild.channels.cache.get(logChannelId) : null;

    if (logChannel) {
        const delayNotice = new EmbedBuilder()
            .setTitle('⏳ Queued Entry System Activation')
            .setDescription(`**User Identity:** ${member.user}\n**Status:** Processing entry stream. Connection delayed for **10 seconds** before roles attach.`)
            .setColor('#ffaa00')
            .setThumbnail(LOGO_URL)
            .setFooter({ text: 'Mega Team Development®', iconURL: LOGO_URL }).setTimestamp();
        logChannel.send({ embeds: [delayNotice] }).catch(() => {});
    }

    // DELAY EXECUTION: Wait exactly 10 seconds before acting
    setTimeout(async () => {
        try {
            // Re-fetch member object to ensure they didn't instantly leave within the 10 seconds
            const activeMember = await member.guild.members.fetch(member.id).catch(() => null);
            if (!activeMember) return;

            const rolesToApply = [];

            // 1. Process Delayed Gateway Auto-Roles
            if (activeMember.user.bot) {
                const targetBotRole = db.botRoles[guildId];
                if (targetBotRole) {
                    const role = activeMember.guild.roles.cache.get(targetBotRole);
                    if (role && role.editable) rolesToApply.push(role);
                }
            } else {
                const targetMemRole = db.memberRoles[guildId];
                if (targetMemRole) {
                    const role = activeMember.guild.roles.cache.get(targetMemRole);
                    if (role && role.editable) rolesToApply.push(role);
                }
            }

            // 2. Fetch Stored Profile Restoration Assets
            const historicalProfile = db.savedRoles[guildId]?.[activeMember.id];
            if (historicalProfile) {
                // Collect saved regular non-admin roles
                if (historicalProfile.roles && historicalProfile.roles.length > 0) {
                    for (const roleId of historicalProfile.roles) {
                        const targetRole = activeMember.guild.roles.cache.get(roleId);
                        if (targetRole && targetRole.editable) {
                            rolesToApply.push(targetRole);
                        }
                    }
                }

                // Append the Custom Admin Placeholder role if the user previously held administrative flags
                if (historicalProfile.wasAdmin) {
                    const markerId = db.adminPlaceholders[guildId];
                    if (markerId) {
                        const markerRole = activeMember.guild.roles.cache.get(markerId);
                        if (markerRole && markerRole.editable) {
                            rolesToApply.push(markerRole);
                        }
                    }
                }
            }

            // Apply all compiled assets in a single, clean payload request
            if (rolesToApply.length > 0) {
                await activeMember.roles.add(rolesToApply).catch(console.error);

                if (logChannel) {
                    const successEmbed = new EmbedBuilder()
                        .setTitle('🔄 Role Deployment Complete')
                        .setDescription(`**User Identity:** ${activeMember.user}\n**Action Taken:** 10-second queue resolved. Applied **${rolesToApply.length}** structural roles. Normal profile restored with high-risk Admin permission nodes scrubbed.`)
                        .setColor('#00ffaa')
                        .setThumbnail(LOGO_URL)
                        .setFooter({ text: 'Mega Team Development®', iconURL: LOGO_URL }).setTimestamp();
                    logChannel.send({ embeds: [successEmbed] }).catch(() => {});
                }
            }
        } catch (error) {
            console.error("Delayed assignment engine encountered a critical error: ", error);
        }
    }, 10000); // 10000 milliseconds = 10 seconds delay
});

client.login(config.token);
