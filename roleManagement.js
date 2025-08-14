
const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');

const commands = [
    {
        data: new SlashCommandBuilder()
            .setName('رتبة')
            .setDescription('إنشاء رتبة جديدة')
            .addStringOption(option =>
                option.setName('اسم_الرتبة')
                    .setDescription('اسم الرتبة الجديدة')
                    .setRequired(true))
            .addStringOption(option =>
                option.setName('لون_الرتبة')
                    .setDescription('لون الرتبة (hex code مثل #ff0000)')
                    .setRequired(false))
            .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),

        async execute(interaction) {
            const roleName = interaction.options.getString('اسم_الرتبة');
            const roleColor = interaction.options.getString('لون_الرتبة');

            const roleOptions = { name: roleName };
            if (roleColor) {
                roleOptions.color = roleColor;
            }

            const role = await interaction.guild.roles.create(roleOptions);
            await interaction.reply(`✅ تم إنشاء الرتبة ${role} بنجاح!`);
        }
    },

    {
        data: new SlashCommandBuilder()
            .setName('اعطاء-رتبة')
            .setDescription('إعطاء رتبة لشخص')
            .addUserOption(option =>
                option.setName('الشخص')
                    .setDescription('الشخص المراد إعطاؤه الرتبة')
                    .setRequired(true))
            .addRoleOption(option =>
                option.setName('الرتبة')
                    .setDescription('الرتبة المراد إعطاؤها')
                    .setRequired(true))
            .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),

        async execute(interaction) {
            const user = interaction.options.getUser('الشخص');
            const role = interaction.options.getRole('الرتبة');
            const member = await interaction.guild.members.fetch(user.id);

            if (member.roles.cache.has(role.id)) {
                return await interaction.reply({ 
                    content: '❌ هذا الشخص يملك هذه الرتبة بالفعل!', 
                    ephemeral: true 
                });
            }

            await member.roles.add(role);

            const embed = {
                color: 0x00ff00,
                title: '✅ تم إعطاء الرتبة بنجاح',
                description: `تم إعطاء رتبة ${role} إلى ${user}`,
                fields: [
                    { name: '👤 العضو', value: `${user.tag}`, inline: true },
                    { name: '🎭 الرتبة', value: `${role.name}`, inline: true },
                    { name: '👮 بواسطة', value: `${interaction.user.tag}`, inline: true }
                ],
                thumbnail: { url: user.displayAvatarURL({ dynamic: true }) },
                timestamp: new Date()
            };

            await interaction.reply({ embeds: [embed] });
        }
    }
];

// تصدير الأوامر
module.exports = commands;
