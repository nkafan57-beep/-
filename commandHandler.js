const { REST, Routes, Collection } = require('discord.js');
const fs = require('fs').promises;
const path = require('path');
const { pointsCommands, handlePointsCommand } = require('../points-system');

class CommandHandler {
    constructor() {
        this.commands = new Collection();
        this.BOT_TOKEN = process.env.BOT_TOKEN;
    }

    async loadCommands(client) {
        try {
            // تحميل أوامر النقاط أولاً
            this.commands.set('points', { commands: pointsCommands }); // Storing as an object with commands array

            const commandsPath = path.join(__dirname, '../commands');
            const commandFiles = await fs.readdir(commandsPath);

            for (const file of commandFiles) {
                if (file.endsWith('.js')) {
                    const filePath = path.join(commandsPath, file);
                    const commandModule = require(filePath);

                    if (commandModule.data) { // For individual commands
                        this.commands.set(commandModule.data.name, commandModule);
                        console.log(`📋 تم تحميل الأمر: ${commandModule.data.name}`);
                    } else if (commandModule.commands && Array.isArray(commandModule.commands)) { // For command systems
                        for (const cmd of commandModule.commands) {
                            this.commands.set(cmd.name, { data: cmd, module: commandModule }); // Store with reference to module
                        }
                        console.log(`📋 تم تحميل نظام: ${path.basename(file, '.js')}`);
                    }
                }
            }

            // تسجيل الأوامر في Discord
            await this.registerCommands(client, this.extractCommandData());

            // إعداد معالج التفاعلات
            this.setupInteractionHandler(client);

        } catch (error) {
            console.error('❌ خطأ في تحميل الأوامر:', error);
        }
    }

    extractCommandData() {
        const discordCommands = [];
        for (const [name, commandData] of this.commands.entries()) {
            if (commandData.data) {
                discordCommands.push(commandData.data.toJSON());
            } else if (commandData.commands) { // System commands
                commandData.commands.forEach(cmd => {
                    discordCommands.push(cmd.toJSON());
                });
            }
        }
        return discordCommands;
    }


    async registerCommands(client, commands) {
        const rest = new REST({ version: '10' }).setToken(this.BOT_TOKEN);

        try {
            console.log('🔄 بدء تحديث أوامر التطبيق...');

            await rest.put(
                Routes.applicationCommands(client.user.id),
                { body: commands }
            );

            console.log('✅ تم تحديث أوامر التطبيق بنجاح!');
        } catch (error) {
            console.error('❌ خطأ في تسجيل الأوامر:', error);
        }
    }

    setupInteractionHandler(client) {
        client.on('interactionCreate', async (interaction) => {
            if (!interaction.isChatInputCommand()) return;

            const commandName = interaction.commandName;
            const command = this.commands.get(commandName);

            if (command) {
                try {
                    if (command.execute) { // Individual command
                        await command.execute(interaction);
                    } else if (command.module && command.module.handleCommand) { // System command
                        await command.module.handleCommand(interaction);
                    } else if (commandName === 'points' && command.commands) { // Explicitly handle points system if loaded as 'points'
                        await handlePointsCommand(interaction);
                    } else {
                        await interaction.reply({ content: 'حدث خطأ: الأمر غير مكتمل!', ephemeral: true });
                    }
                } catch (error) {
                    console.error(`❌ خطأ في تنفيذ الأمر "${commandName}":`, error);
                    const errorMessage = 'حدث خطأ أثناء تنفيذ الأمر!';
                    if (interaction.replied || interaction.deferred) {
                        await interaction.followUp({ content: errorMessage, ephemeral: true });
                    } else {
                        await interaction.reply({ content: errorMessage, ephemeral: true });
                    }
                }
            } else {
                // Fallback for systems not directly mapped or if command not found
                await this.handleSystemCommand(interaction);
            }
        });
    }

    async handleSystemCommand(interaction) {
        const systemNames = ['points-system', 'games-system', 'ticket-system', 'verification-system', 'language-system'];

        for (const systemName of systemNames) {
            try {
                const systemModule = require(`../${systemName}`);
                let handled = false;

                // Check for specific system handlers
                if (systemName === 'points-system' && systemModule.handlePointsCommand) {
                    handled = await systemModule.handlePointsCommand(interaction);
                } else if (systemName === 'games-system' && systemModule.handleGamesCommand) {
                    handled = await systemModule.handleGamesCommand(interaction);
                } else if (systemName === 'ticket-system' && systemModule.handleTicketCommand) {
                    handled = await systemModule.handleTicketCommand(interaction);
                } else if (systemName === 'verification-system' && systemModule.handleVerificationCommand) {
                    handled = await systemModule.handleVerificationCommand(interaction);
                } else if (systemName === 'language-system' && systemModule.handleLanguageCommand) {
                    handled = await systemModule.handleLanguageCommand(interaction);
                }

                if (handled) return; // Stop if the interaction was handled by a system

            } catch (error) {
                // If the system file doesn't exist or doesn't have the expected handler, continue to the next system.
                // console.warn(`⚠️ لم يتم العثور على معالج للنظام ${systemName} أو حدث خطأ: ${error.message}`);
                continue;
            }
        }

        // If no system handled the command
        await interaction.reply({ content: 'أمر غير معروف!', ephemeral: true });
    }
}

module.exports = new CommandHandler();