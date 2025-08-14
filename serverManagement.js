
const { SlashCommandBuilder, ChannelType, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('انشاء')
        .setDescription('إنشاء روم جديد')
        .addStringOption(option =>
            option.setName('اسم_الروم')
                .setDescription('اسم الروم الجديد')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('نوع_الروم')
                .setDescription('نوع الروم')
                .setRequired(true)
                .addChoices(
                    { name: 'شات', value: 'text' },
                    { name: 'فويس', value: 'voice' }
                ))
        .addChannelOption(option =>
            option.setName('الكاتاجوري')
                .setDescription('الكاتاجوري المراد إضافة الروم إليه')
                .addChannelTypes(ChannelType.GuildCategory)
                .setRequired(false))
        .addBooleanOption(option =>
            option.setName('مقفل')
                .setDescription('هل الروم مقفل؟')
                .setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

    async execute(interaction) {
        const roomName = interaction.options.getString('اسم_الروم');
        const roomType = interaction.options.getString('نوع_الروم');
        const category = interaction.options.getChannel('الكاتاجوري');
        const isLocked = interaction.options.getBoolean('مقفل') || false;

        const channelType = roomType === 'voice' ? ChannelType.GuildVoice : ChannelType.GuildText;

        const channelOptions = {
            name: roomName,
            type: channelType,
            parent: category?.id || null,
        };

        if (isLocked) {
            channelOptions.permissionOverwrites = [
                {
                    id: interaction.guild.roles.everyone,
                    deny: roomType === 'voice' ? 
                        [PermissionFlagsBits.Connect] : 
                        [PermissionFlagsBits.SendMessages],
                },
            ];
        }

        const channel = await interaction.guild.channels.create(channelOptions);

        await interaction.reply(`✅ تم إنشاء ${roomType === 'voice' ? 'روم الصوت' : 'روم الشات'} ${channel} بنجاح! ${isLocked ? '(مقفل)' : '(مفتوح)'}`);
    }
};
