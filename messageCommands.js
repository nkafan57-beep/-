
const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('مسح')
        .setDescription('حذف رسائل')
        .addIntegerOption(option =>
            option.setName('العدد')
                .setDescription('عدد الرسائل المراد حذفها')
                .setRequired(true)
                .setMinValue(1)
                .setMaxValue(100))
        .addUserOption(option =>
            option.setName('الشخص')
                .setDescription('حذف رسائل شخص معين (اختياري)')
                .setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

    async execute(interaction) {
        const amount = interaction.options.getInteger('العدد');
        const targetUser = interaction.options.getUser('الشخص');

        const messages = await interaction.channel.messages.fetch({ limit: 100 });
        let messagesToDelete;

        if (targetUser) {
            messagesToDelete = messages.filter(msg => msg.author.id === targetUser.id).first(amount);
        } else {
            messagesToDelete = Array.from(messages.values()).slice(0, amount);
        }

        await interaction.channel.bulkDelete(messagesToDelete);
        
        const embed = {
            color: 0xff9900,
            title: '🗑️ تم حذف الرسائل',
            description: `تم حذف **${messagesToDelete.length}** رسالة`,
            fields: [
                { name: '📊 العدد', value: `${messagesToDelete.length}`, inline: true },
                { name: '👤 الهدف', value: targetUser ? `${targetUser.tag}` : 'الكل', inline: true },
                { name: '👮 بواسطة', value: `${interaction.user.tag}`, inline: true }
            ],
            timestamp: new Date()
        };

        await interaction.reply({ embeds: [embed] });
    }
};
