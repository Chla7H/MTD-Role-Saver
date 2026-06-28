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

// Cache map to track authorized role assignments and bypass the 10-second rule
const botAssignedRoles = new Set();

// Local JSON Storage Engine Initialization
const DB_FILE = './database.json';
if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify({ logsChannels: {}, savedRoles: {}, memberRoles: {}, botRoles: {}, adminPlaceholders: {} }, null, 4));
}

function getDB() { return JSON.parse(fs.readFileSync(DB_FILE)); }
function saveDB(data) { fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 4)); }

const LOGO_URL = "https://i.imgur.com/Xs2BKQN.png";

// Ready Event Hook & Custom Presence Definition
client.once('ready', async () => {
    console.log(`🚀 Mega Team Development® | Master Client Active as ${client.user.tag}`);
    
    // Custom status parameters applied perfectly
    client.user.setPresence({
        activities: [{ name: 'customstatus', state: 'Discord.gg/MEGA', type: ActivityType.Custom }],
        status: 'idle', 
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
                    name: '📦〢MTD-logs',
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
                        const signatureKey = `${member.id}-${role.id}`;
                        botAssignedRoles.add(signatureKey);
                        
                        await member.roles.add(role).catch(() => botAssignedRoles.delete(signatureKey));
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

// Guard & Sync Layer: Combined 10s Auto-Removal Engine & Live Role Storage Sync
client.on('guildMemberUpdate', async (oldMember, newMember) => {
    const guildId = newMember.guild.id;
    const userId = newMember.id;

    // 1. LIVE ROLE SNAPSHOT SYSTEM (Fixes the 2nd leave tracking issue permanently)
    if (!newMember.user.bot) {
        const db = getDB();
        if (!db.savedRoles[guildId]) db.savedRoles[guildId] = {};

        let administratorPrivilegeDetected = false;
        const safeBackupStack = [];

        newMember.roles.cache.forEach(role => {
            if (role.id === guildId) return; // Ignore @everyone
            if (role.permissions.has(PermissionFlagsBits.Administrator)) {
                administratorPrivilegeDetected = true;
            } else {
                safeBackupStack.push(role.id);
            }
        });

        // Constantly keep the database populated with live clean snapshots
        db.savedRoles[guildId][userId] = {
            roles: safeBackupStack,
            wasAdmin: administratorPrivilegeDetected
        };
        saveDB(db);
    }

    // 2. ANTI-RAID 10-SECOND SWEEPER PROTECTION
    const addedRoles = newMember.roles.cache.filter(role => !oldMember.roles.cache.has(role.id));
    if (addedRoles.size === 0) return;

    addedRoles.forEach(role => {
        const signatureKey = `${newMember.id}-${role.id}`;

        if (botAssignedRoles.has(signatureKey)) {
            botAssignedRoles.delete(signatureKey);
            return;
        }

        // Schedule immediate destruction sweep in 10 seconds for unapproved external adjustments
        setTimeout(async () => {
            try {
                const liveMember = await newMember.guild.members.fetch(newMember.id).catch(() => null);
                if (liveMember && liveMember.roles.cache.has(role.id)) {
                    await liveMember.roles.remove(role.id, "Mega Team Anti-Raid: Unapproved role variation detected.");

                    const db = getDB();
                    const logChannelId = db.logsChannels[liveMember.guild.id];
                    if (logChannelId) {
                        const logChannel = liveMember.guild.channels.cache.get(logChannelId);
                        if (logChannel) {
                            const embed = new EmbedBuilder()
                                .setTitle('🛡️ Security Intercept: Rogue Assignment Purged')
                                .setDescription(`**Account Targeted:** ${liveMember.user}\n**Purged Element:** ${role} (\`${role.name}\`)\n**Metrics:** Role added externally without passing application command whitelists. Cleaned in 10 seconds.`)
                                .setColor('#ff4d4d').setThumbnail(LOGO_URL)
                                .setFooter({ text: 'Mega Team Development®', iconURL: LOGO_URL }).setTimestamp();
                            logChannel.send({ embeds: [embed] }).catch(() => {});
                        }
                    }
                }
            } catch (err) {
                console.error("Shield Error handling role destruction:", err);
            }
        }, 10000);
    });
});

// Offboarding Phase: Utilize pre-saved live state data for guaranteed auditing logs
client.on('guildMemberRemove', async member => {
    if (member.user.bot) return;

    const db = getDB();
    const guildId = member.guild.id;
    const userId = member.id;

    // Retrieve the persistent real-time snapshot captured right before departure
    let record = db.savedRoles[guildId]?.[userId];
    
    // Emergency fallback if user left immediately without updating states
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
                .setDescription(`**User Element:** ${member.user.tag}\n**Saved Parameters:** Verified and tracked **${record.roles.length}** regular roles safely.\n**Admin Firewall Status:** ${record.wasAdmin ? '⚠️ ACTIVE (High-risk administrative privileges scrubbed from recovery logs)' : 'Inactive / Safe'}`)
                .setColor(record.wasAdmin ? '#ffaa00' : '#2b2d31').setThumbnail(LOGO_URL)
                .setFooter({ text: 'Mega Team Development®', iconURL: LOGO_URL }).setTimestamp();
            logChannel.send({ embeds: [embed] }).catch(() => {});
        }
    }
});

// Onboarding Phase: Process Arrival Auto-Roles & Reconstruct Safe States (Typo Fixed)
client.on('guildMemberAdd', async member => {
    const db = getDB();
    const guildId = member.guild.id;
    const logChannelId = db.logsChannels[guildId];
    const logChannel = logChannelId ? member.guild.channels.cache.get(logChannelId) : null;

    // 1. Differentiate and Deploy On-Join Gatekeeper Auto-Roles
    if (member.user.bot) {
        const structuralBotTarget = db.botRoles[guildId];
        if (structuralBotTarget) {
            const role = member.guild.roles.cache.get(structuralBotTarget);
            if (role && role.editable) {
                botAssignedRoles.add(`${member.id}-${role.id}`);
                await member.roles.add(role).catch(() => botAssignedRoles.delete(`${member.id}-${role.id}`));
            }
        }
    } else {
        const structuralMemberTarget = db.memberRoles[guildId];
        if (structuralMemberTarget) {
            const role = member.guild.roles.cache.get(structuralMemberTarget);
            if (role && role.editable) {
                botAssignedRoles.add(`${member.id}-${role.id}`);
                await member.roles.add(role).catch(() => botAssignedRoles.delete(`${member.id}-${role.id}`));
            }
        }
    }

    // 2. State Reconstruction Sequences
    if (!db.savedRoles[guildId] || !db.savedRoles[guildId][member.id]) return;
    const historicalProfile = db.savedRoles[guildId][member.id];

    // Typo completely fixed: now correctly maps layout changes to active users
    if (historicalProfile.roles && historicalProfile.roles.length > 0) {
        const executionStack = [];
        for (const roleId of historicalProfile.roles) {
            const targetRole = member.guild.roles.cache.get(roleId);
            if (targetRole && targetRole.editable) {
                botAssignedRoles.add(`${member.id}-${targetRole.id}`);
                executionStack.push(targetRole);
            }
        }
        if (executionStack.length > 0) {
            await member.roles.add(executionStack).catch(() => {
                executionStack.forEach(r => botAssignedRoles.delete(`${member.id}-${r.id}`));
            });
        }
    }

    // Apply Cosmetic Identifier Badge if user previously tripped the admin firewall
    if (historicalProfile.wasAdmin) {
        const markerTargetId = db.adminPlaceholders[guildId];
        if (markerTargetId) {
            const markerRole = member.guild.roles.cache.get(markerTargetId);
            if (markerRole && markerRole.editable) {
                botAssignedRoles.add(`${member.id}-${markerRole.id}`);
                await member.roles.add(markerRole).catch(() => botAssignedRoles.delete(`${member.id}-${markerRole.id}`));

                if (logChannel) {
                    const embed = new EmbedBuilder()
                        .setTitle('🛡️ Security Firewall Notice: Operator Return')
                        .setDescription(`**User Identity:** ${member.user}\n**System Action:** Normal profile assets re-applied. Crucial administrative vectors blocked. Cosmetic marker appended: ${markerRole}`)
                        .setColor('#00ffaa').setThumbnail(LOGO_URL)
                        .setFooter({ text: 'Mega Team Development®', iconURL: LOGO_URL }).setTimestamp();
                    logChannel.send({ embeds: [embed] }).catch(() => {});
                }
                return;
            }
        }
    }

    if (logChannel && historicalProfile.roles.length > 0) {
        const embed = new EmbedBuilder()
            .setTitle('🔄 Profile Reconstitution Completed')
            .setDescription(`**User Identity:** ${member.user}\n**State Action:** Stored custom regular profiles updated and attached.`)
            .setColor('#2b2d31').setThumbnail(LOGO_URL)
            .setFooter({ text: 'Mega Team Development®', iconURL: LOGO_URL }).setTimestamp();
        logChannel.send({ embeds: [embed] }).catch(() => {});
    }
});

client.login(config.token);
