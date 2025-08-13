const { SlashCommandBuilder, MessageFlags } = require('discord.js');

console.log('✅ تم تحميل نظام الألعاب بنجاح!');

// دالة تنظيف النص (إزالة الهمزات والمسافات الزائدة)
function normalizeText(text) {
    return text
        .toLowerCase()
        .replace(/[أإآ]/g, 'ا')
        .replace(/[ة]/g, 'ه')
        .replace(/[ى]/g, 'ي')
        .replace(/[ء]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
}

// قواعد بيانات الألعاب
const gameRooms = new Map(); // معرف الغرفة -> بيانات اللعبة
const playerStats = new Map(); // معرف اللاعب -> إحصائيات
const activeGames = new Map(); // معرف القناة -> اللعبة النشطة

// دوال مساعدة
function getRandomElement(array) {
    return array[Math.floor(Math.random() * array.length)];
}

function shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

// أوامر الألعاب الجماعية
const gamesCommands = [
    new SlashCommandBuilder()
        .setName('لعبة-تخمين-الرقم')
        .setDescription('لعبة تخمين الرقم الجماعية')
        .addIntegerOption(option =>
            option.setName('الحد_الأدنى')
                .setDescription('أقل رقم في اللعبة')
                .setRequired(true)
                .setMinValue(1))
        .addIntegerOption(option =>
            option.setName('الحد_الأعلى')
                .setDescription('أعلى رقم في اللعبة')
                .setRequired(true)
                .setMaxValue(10000)),

    new SlashCommandBuilder()
        .setName('لعبة-الأسئلة')
        .setDescription('لعبة أسئلة ثقافية جماعية')
        .addStringOption(option =>
            option.setName('الفئة')
                .setDescription('فئة الأسئلة')
                .setRequired(false)
                .addChoices(
                    { name: 'عامة', value: 'general' },
                    { name: 'تاريخ', value: 'history' },
                    { name: 'علوم', value: 'science' },
                    { name: 'رياضة', value: 'sports' },
                    { name: 'جغرافيا', value: 'geography' }
                )),

    new SlashCommandBuilder()
        .setName('لعبة-كلمة-سر')
        .setDescription('لعبة كلمة السر الجماعية')
        .addStringOption(option =>
            option.setName('المستوى')
                .setDescription('مستوى صعوبة اللعبة')
                .setRequired(false)
                .addChoices(
                    { name: 'سهل', value: 'easy' },
                    { name: 'متوسط', value: 'medium' },
                    { name: 'صعب', value: 'hard' }
                )),

    new SlashCommandBuilder()
        .setName('لعبة-سباق-الكلمات')
        .setDescription('لعبة سباق كتابة الكلمات')
        .addIntegerOption(option =>
            option.setName('عدد_الكلمات')
                .setDescription('عدد الكلمات في السباق')
                .setRequired(false)
                .setMinValue(3)
                .setMaxValue(10)),

    new SlashCommandBuilder()
        .setName('لعبة-الذاكرة')
        .setDescription('لعبة اختبار الذاكرة الجماعية')
        .addIntegerOption(option =>
            option.setName('المستوى')
                .setDescription('مستوى صعوبة اللعبة')
                .setRequired(false)
                .setMinValue(3)
                .setMaxValue(8)),

    new SlashCommandBuilder()
        .setName('لعبة-ترتيب-الأرقام')
        .setDescription('لعبة ترتيب الأرقام بسرعة')
        .addIntegerOption(option =>
            option.setName('عدد_الأرقام')
                .setDescription('عدد الأرقام المراد ترتيبها')
                .setRequired(false)
                .setMinValue(5)
                .setMaxValue(15)),

    new SlashCommandBuilder()
        .setName('لعبة-احزر-الإيموجي')
        .setDescription('لعبة تخمين معنى الإيموجي')
        .addStringOption(option =>
            option.setName('النوع')
                .setDescription('نوع التخمين')
                .setRequired(false)
                .addChoices(
                    { name: 'أفلام', value: 'movies' },
                    { name: 'دول', value: 'countries' },
                    { name: 'حيوانات', value: 'animals' },
                    { name: 'طعام', value: 'food' }
                )),

    new SlashCommandBuilder()
        .setName('لعبة-من-الأسرع')
        .setDescription('لعبة من يجيب أسرع على السؤال')
        .addStringOption(option =>
            option.setName('النوع')
                .setDescription('نوع الأسئلة')
                .setRequired(false)
                .addChoices(
                    { name: 'حسابية', value: 'math' },
                    { name: 'لغوية', value: 'language' },
                    { name: 'منطقية', value: 'logic' }
                )),

    new SlashCommandBuilder()
        .setName('لعبة-البحث-المخفي')
        .setDescription('لعبة البحث عن الكلمات المخفية')
        .addStringOption(option =>
            option.setName('الحجم')
                .setDescription('حجم الشبكة')
                .setRequired(false)
                .addChoices(
                    { name: 'صغير 8x8', value: 'small' },
                    { name: 'متوسط 10x10', value: 'medium' },
                    { name: 'كبير 12x12', value: 'large' }
                )),

    new SlashCommandBuilder()
        .setName('لعبة-الألوان')
        .setDescription('لعبة تخمين الألوان والتسلسل')
        .addIntegerOption(option =>
            option.setName('الطول')
                .setDescription('طول التسلسل')
                .setRequired(false)
                .setMinValue(4)
                .setMaxValue(10)),

    new SlashCommandBuilder()
        .setName('إنهاء-اللعبة')
        .setDescription('إنهاء اللعبة الحالية في هذه القناة'),

    new SlashCommandBuilder()
        .setName('إحصائيات-الألعاب')
        .setDescription('عرض إحصائيات الألعاب')
        .addUserOption(option =>
            option.setName('اللاعب')
                .setDescription('اللاعب المراد عرض إحصائياته')
                .setRequired(false)),

    new SlashCommandBuilder()
        .setName('قائمة-الألعاب')
        .setDescription('عرض قائمة بجميع الألعاب المتاحة'),
    new SlashCommandBuilder()
        .setName('عجلة-الحظ')
        .setDescription('ابدأ لعبة عجلة الحظ مع صورة متحركة'),

    new SlashCommandBuilder()
        .setName('نرد')
        .setDescription('ابدأ لعبة النرد الجماعية')
];

// بيانات الألعاب
const gameData = {
    questions: {
        general: [
            { question: 'ما هي عاصمة السعودية؟', answers: ['الرياض', 'رياض'], correct: 'الرياض' },
            { question: 'كم عدد قارات العالم؟', answers: ['7', 'سبعة', 'سبع'], correct: '7' },
            { question: 'ما هو أكبر محيط في العالم؟', answers: ['الهادئ', 'المحيط الهادئ'], correct: 'الهادئ' },
            { question: 'في أي سنة تأسست المملكة العربية السعودية؟', answers: ['1932', '١٩٣٢'], correct: '1932' },
            { question: 'ما هو أطول نهر في العالم؟', answers: ['النيل', 'نيل'], correct: 'النيل' }
        ],
        history: [
            { question: 'من هو أول خليفة راشدي؟', answers: ['أبو بكر الصديق', 'ابو بكر', 'أبو بكر'], correct: 'أبو بكر الصديق' },
            { question: 'في أي عام سقطت الدولة العثمانية؟', answers: ['1922', '١٩٢٢'], correct: '1922' },
            { question: 'من فتح القسطنطينية؟', answers: ['محمد الفاتح', 'السلطان محمد الفاتح'], correct: 'محمد الفاتح' },
            { question: 'متى بدأت الحرب العالمية الأولى؟', answers: ['1914', '١٩١٤'], correct: '1914' },
            { question: 'من هو قائد المسلمين في معركة حطين؟', answers: ['صلاح الدين الأيوبي', 'صلاح الدين'], correct: 'صلاح الدين الأيوبي' }
        ],
        science: [
            { question: 'ما هو الرمز الكيميائي للذهب؟', answers: ['Au', 'AU'], correct: 'Au' },
            { question: 'كم عدد عظام جسم الإنسان البالغ؟', answers: ['206', 'مئتان وستة'], correct: '206' },
            { question: 'ما هو أسرع حيوان في العالم؟', answers: ['الفهد', 'فهد'], correct: 'الفهد' },
            { question: 'ما هو أقرب كوكب للشمس؟', answers: ['عطارد', 'كوكب عطارد'], correct: 'عطارد' },
            { question: 'كم قلب للأخطبوط؟', answers: ['3', 'ثلاثة', 'ثلاث'], correct: '3' }
        ],
        sports: [
            { question: 'كم لاعب في فريق كرة القدم؟', answers: ['11', 'أحد عشر', 'احد عشر'], correct: '11' },
            { question: 'في أي دولة نشأت لعبة التنس؟', answers: ['فرنسا', 'france'], correct: 'فرنسا' },
            { question: 'كم عدد أشواط مباراة التنس؟', answers: ['3 أو 5', '3او5', 'ثلاثة أو خمسة'], correct: '3 أو 5' },
            { question: 'ما هو عدد لاعبي فريق كرة السلة؟', answers: ['5', 'خمسة', 'خمس'], correct: '5' },
            { question: 'كم مرة فازت البرازيل بكأس العالم؟', answers: ['5', 'خمسة', 'خمس'], correct: '5' }
        ],
        geography: [
            { question: 'ما هي أكبر دولة في العالم من حيث المساحة؟', answers: ['روسيا', 'russia'], correct: 'روسيا' },
            { question: 'ما هو أطول نهر في آسيا؟', answers: ['اليانغتسي', 'نهر اليانغتسي'], correct: 'اليانغتسي' },
            { question: 'كم عدد الدول العربية؟', answers: ['22', 'اثنان وعشرون'], correct: '22' },
            { question: 'ما هي عاصمة اليابان؟', answers: ['طوكيو', 'tokyo'], correct: 'طوكيو' },
            { question: 'في أي قارة تقع مصر؟', answers: ['أفريقيا', 'افريقيا'], correct: 'أفريقيا' }
        ]
    },
    words: {
        easy: ['كتاب', 'قلم', 'بيت', 'سيارة', 'شجرة', 'ماء', 'شمس', 'قمر', 'نجمة', 'زهرة'],
        medium: ['مدرسة', 'مستشفى', 'مطعم', 'حديقة', 'مكتبة', 'متحف', 'سوق', 'مطار', 'محطة', 'ملعب'],
        hard: ['ديمقراطية', 'فلسفة', 'تكنولوجيا', 'اقتصاد', 'سياسة', 'جغرافيا', 'رياضيات', 'فيزياء', 'كيمياء', 'أحياء']
    },
    emojis: {
        movies: [
            { emojis: '🦁👑', answer: 'الأسد الملك', hints: ['فيلم ديزني', 'حيوان', 'ملك الغابة'] },
            { emojis: '🐠🔍', answer: 'البحث عن نيمو', hints: ['سمكة', 'ديزني', 'محيط'] },
            { emojis: '❄️👸', answer: 'ملكة الثلج', hints: ['برد', 'أميرة', 'ديزني'] },
            { emojis: '🕷️👨', answer: 'الرجل العنكبوت', hints: ['بطل خارق', 'شبكة', 'مارفل'] },
            { emojis: '🦇👨', answer: 'باتمان', hints: ['بطل خارق', 'ليل', 'خفاش'] }
        ],
        countries: [
            { emojis: '🐪🏜️', answer: 'السعودية', hints: ['صحراء', 'خليج', 'عرب'] },
            { emojis: '🗾⛩️', answer: 'اليابان', hints: ['آسيا', 'ساكورا', 'تكنولوجيا'] },
            { emojis: '🥖🗼', answer: 'فرنسا', hints: ['أوروبا', 'برج إيفل', 'باريس'] },
            { emojis: '🍕🍝', answer: 'إيطاليا', hints: ['معكرونة', 'أوروبا', 'روما'] },
            { emojis: '🏔️🧀', answer: 'سويسرا', hints: ['جبال', 'جبنة', 'ساعات'] }
        ],
        animals: [
            { emojis: '🦒🔸', answer: 'زرافة', hints: ['رقبة طويلة', 'أفريقيا', 'أطول حيوان'] },
            { emojis: '🐧❄️', answer: 'بطريق', hints: ['قطب جنوبي', 'أبيض وأسود', 'لا يطير'] },
            { emojis: '🦘🥊', answer: 'كنغر', hints: ['أستراليا', 'يقفز', 'جيب'] },
            { emojis: '🐨🌿', answer: 'كوالا', hints: ['أستراليا', 'شجرة', 'رمادي'] },
            { emojis: '🦓⚫⚪', answer: 'حمار وحشي', hints: ['خطوط', 'أفريقيا', 'أبيض وأسود'] }
        ],
        food: [
            { emojis: '🍇🧀', answer: 'عنب وجبنة', hints: ['فاكهة', 'منتج ألبان', 'وجبة خفيفة'] },
            { emojis: '🍫☕', answer: 'شوكولاتة وقهوة', hints: ['حلو', 'مشروب', 'كافيين'] },
            { emojis: '🥗🥑', answer: 'سلطة أفوكادو', hints: ['خضار', 'صحي', 'أخضر'] },
            { emojis: '🍣🐟', answer: 'سوشي', hints: ['ياباني', 'سمك نيء', 'أرز'] },
            { emojis: '🌮🌶️', answer: 'تاكو حار', hints: ['مكسيكي', 'لحمة', 'حار'] }
        ]
    },
    mathQuestions: [
        { question: '7 + 8 = ?', answer: '15' },
        { question: '12 × 3 = ?', answer: '36' },
        { question: '45 ÷ 5 = ?', answer: '9' },
        { question: '20 - 7 = ?', answer: '13' },
        { question: '6 × 8 = ?', answer: '48' },
        { question: '100 ÷ 4 = ?', answer: '25' },
        { question: '15 + 27 = ?', answer: '42' },
        { question: '9 × 7 = ?', answer: '63' },
        { question: '56 ÷ 8 = ?', answer: '7' },
        { question: '33 - 18 = ?', answer: '15' }
    ],
    languageQuestions: [
        { question: 'ما هو جمع كلمة "كتاب"؟', answer: 'كتب' },
        { question: 'ما هو مضاد كلمة "كبير"؟', answer: 'صغير' },
        { question: 'ما هو مرادف كلمة "سريع"؟', answer: 'عاجل' },
        { question: 'كم حرف في كلمة "مدرسة"؟', answer: '5' },
        { question: 'ما هو مؤنث كلمة "أسد"؟', answer: 'لبؤة' },
        { question: 'ما هو جمع كلمة "طالب"؟', answer: 'طلاب' },
        { question: 'ما هو مضاد كلمة "قديم"؟', answer: 'جديد' },
        { question: 'ما هو مرادف كلمة "جميل"؟', answer: 'حسن' },
        { question: 'كم حرف في كلمة "تلميذ"؟', answer: '5' },
        { question: 'ما هو مذكر كلمة "بقرة"؟', answer: 'ثور' }
    ],
    logicQuestions: [
        { question: 'إذا كان اليوم الثلاثاء، فما هو اليوم بعد غد؟', answer: 'الخميس' },
        { question: 'ما هو الرقم التالي في المتسلسلة: 2, 4, 6, 8, ؟', answer: '10' },
        { question: 'إذا كان عمر أحمد ضعف عمر سارة، وعمر سارة 15 سنة، فكم عمر أحمد؟', answer: '30' },
        { question: 'ما هو الرقم المفقود: 1, 1, 2, 3, 5, ؟', answer: '8' },
        { question: 'إذا كانت الساعة الآن 3:00، فكم ستكون بعد 5 ساعات؟', answer: '8:00' },
        { question: 'كم مثلث يمكن رؤيته في مربع مقسم بخطين قطريين؟', answer: '8' },
        { question: 'إذا كان A = 1، B = 2، C = 3، فكم يساوي D؟', answer: '4' },
        { question: 'ما هو نصف نصف 100؟', answer: '25' },
        { question: 'إذا كان لديك 5 تفاحات وأعطيت 2، كم تبقى؟', answer: '3' },
        { question: 'ما هو الرقم الذي إذا ضربته في نفسه حصلت على 49؟', answer: '7' }
    ],
    colors: ['🔴', '🔵', '🟢', '🟡', '🟣', '🟠'],
    
    // صور عجلة الحظ
    wheelImages: [
        'https://i.imgur.com/wheel1.gif', // عجلة تدور - بطيئة
        'https://i.imgur.com/wheel2.gif', // عجلة تدور - متوسطة
        'https://i.imgur.com/wheel3.gif', // عجلة تدور - سريعة
        'https://i.imgur.com/wheel_stop.png' // عجلة متوقفة
    ],
    
    // رسائل التدوير
    spinMessages: [
        '🎯 العجلة تدور...',
        '⭐ العجلة تدور بسرعة...',
        '🌟 العجلة تبطئ...',
        '🎲 العجلة توقفت!'
    ],
    diceImages: [
        { 
            url: 'https://raw.githubusercontent.com/user/repo/main/dice1.png',
            points: 1,
            type: 'normal'
        },
        { 
            url: 'https://raw.githubusercontent.com/user/repo/main/dice2.png',
            points: 2,
            type: 'normal'
        },
        { 
            url: 'https://raw.githubusercontent.com/user/repo/main/dice3.png',
            points: 3,
            type: 'normal'
        },
        { 
            url: 'https://raw.githubusercontent.com/user/repo/main/dice4.png',
            points: 4,
            type: 'normal'
        },
        { 
            url: 'https://raw.githubusercontent.com/user/repo/main/dice5.png',
            points: 5,
            type: 'normal'
        },
        { 
            url: 'https://raw.githubusercontent.com/user/repo/main/dice6.png',
            points: 6,
            type: 'normal'
        },
        { 
            url: 'https://raw.githubusercontent.com/user/repo/main/plus2.png',
            points: 2,
            type: 'bonus'
        },
        { 
            url: 'https://raw.githubusercontent.com/user/repo/main/minus2.png',
            points: -2,
            type: 'penalty'
        },
        { 
            url: 'https://raw.githubusercontent.com/user/repo/main/block_red.png',
            points: 0,
            type: 'block'
        },
        { 
            url: 'https://raw.githubusercontent.com/user/repo/main/block_green.png',
            points: 0,
            type: 'safe'
        }
    ]
};

// دالة معالجة أوامر الألعاب
async function handleGamesCommand(interaction) {
    const { commandName, channelId } = interaction;

    try {
        switch (commandName) {
            case 'لعبة-تخمين-الرقم':
                if (activeGames.has(channelId)) {
                    await interaction.reply({ content: '❌ هناك لعبة نشطة بالفعل في هذه القناة! استخدم `/إنهاء-اللعبة` لإنهائها أولاً.', flags: MessageFlags.Ephemeral });
                    return;
                }

                const minNum = interaction.options.getInteger('الحد_الأدنى');
                const maxNum = interaction.options.getInteger('الحد_الأعلى');

                if (minNum >= maxNum) {
                    await interaction.reply({ content: '❌ الحد الأدنى يجب أن يكون أقل من الحد الأعلى!', flags: MessageFlags.Ephemeral });
                    return;
                }

                const targetNumber = Math.floor(Math.random() * (maxNum - minNum + 1)) + minNum;

                activeGames.set(channelId, {
                    type: 'number-guess',
                    targetNumber,
                    minNum,
                    maxNum,
                    attempts: 0,
                    players: new Set(),
                    startTime: Date.now()
                });

                const numberGameEmbed = {
                    color: 0x3498db,
                    title: '🎲 لعبة تخمين الرقم',
                    description: `تم اختيار رقم بين **${minNum}** و **${maxNum}**\nاكتب تخمينك في المحادثة!`,
                    fields: [
                        { name: '🎯 الهدف', value: 'اكتب الرقم الصحيح لتفوز!', inline: true },
                        { name: '⏱️ الوقت', value: 'لا يوجد حد زمني', inline: true },
                        { name: '👥 اللاعبون', value: 'متعدد اللاعبين', inline: true }
                    ],
                    footer: { text: 'اكتب رقماً في المحادثة للمشاركة!' },
                    timestamp: new Date()
                };

                await interaction.reply({ embeds: [numberGameEmbed] });
                break;

            case 'لعبة-الأسئلة':
                if (activeGames.has(channelId)) {
                    await interaction.reply({ content: '❌ هناك لعبة نشطة بالفعل في هذه القناة!', flags: MessageFlags.Ephemeral });
                    return;
                }

                const category = interaction.options.getString('الفئة') || 'general';
                const questions = gameData.questions[category];
                const randomQuestion = getRandomElement(questions);

                activeGames.set(channelId, {
                    type: 'question',
                    question: randomQuestion,
                    category,
                    players: new Set(),
                    startTime: Date.now()
                });

                const questionEmbed = {
                    color: 0xe74c3c,
                    title: '❓ لعبة الأسئلة الثقافية',
                    description: `**الفئة:** ${category === 'general' ? 'عامة' : category === 'history' ? 'تاريخ' : category === 'science' ? 'علوم' : category === 'sports' ? 'رياضة' : 'جغرافيا'}\n\n**السؤال:**\n${randomQuestion.question}`,
                    fields: [
                        { name: '🎯 المطلوب', value: 'اكتب الإجابة في المحادثة!', inline: true },
                        { name: '⏱️ الوقت', value: '60 ثانية', inline: true },
                        { name: '👥 المشاركة', value: 'للجميع', inline: true }
                    ],
                    footer: { text: 'اكتب إجابتك في المحادثة!' },
                    timestamp: new Date()
                };

                await interaction.reply({ embeds: [questionEmbed] });

                // إنهاء اللعبة تلقائياً بعد 60 ثانية
                setTimeout(() => {
                    if (activeGames.has(channelId) && activeGames.get(channelId).type === 'question') {
                        activeGames.delete(channelId);
                        interaction.followUp(`⏰ انتهى الوقت! الإجابة الصحيحة كانت: **${randomQuestion.correct}**`);
                    }
                }, 60000);
                break;

            case 'لعبة-كلمة-سر':
                if (activeGames.has(channelId)) {
                    await interaction.reply({ content: '❌ هناك لعبة نشطة بالفعل في هذه القناة!', ephemeral: true });
                    return;
                }

                const difficulty = interaction.options.getString('المستوى') || 'medium';
                const words = gameData.words[difficulty];
                const secretWord = getRandomElement(words);
                const hiddenWord = secretWord.split('').map(char => char === ' ' ? ' ' : '_').join(' ');

                activeGames.set(channelId, {
                    type: 'word-guess',
                    secretWord,
                    hiddenWord,
                    guessedLetters: new Set(),
                    wrongGuesses: 0,
                    maxWrongGuesses: 6,
                    players: new Set(),
                    startTime: Date.now()
                });

                const wordGameEmbed = {
                    color: 0x9b59b6,
                    title: '🔤 لعبة كلمة السر',
                    description: `**المستوى:** ${difficulty === 'easy' ? 'سهل' : difficulty === 'medium' ? 'متوسط' : 'صعب'}\n\n**الكلمة:**\n\`\`\`${hiddenWord}\`\`\``,
                    fields: [
                        { name: '❤️ المحاولات المتبقية', value: '6', inline: true },
                        { name: '📝 الأحرف المستخدمة', value: 'لا يوجد', inline: true },
                        { name: '🎯 المطلوب', value: 'اكتب حرف واحد', inline: true }
                    ],
                    footer: { text: 'اكتب حرفاً واحداً في المحادثة!' },
                    timestamp: new Date()
                };

                await interaction.reply({ embeds: [wordGameEmbed] });
                break;

            case 'لعبة-سباق-الكلمات':
                if (activeGames.has(channelId)) {
                    await interaction.reply({ content: '❌ هناك لعبة نشطة بالفعل في هذه القناة!', ephemeral: true });
                    return;
                }

                const wordCount = interaction.options.getInteger('عدد_الكلمات') || 5;
                const raceWords = [];
                for (let i = 0; i < wordCount; i++) {
                    raceWords.push(getRandomElement(gameData.words.medium));
                }

                activeGames.set(channelId, {
                    type: 'word-race',
                    words: raceWords,
                    currentIndex: 0,
                    players: new Map(),
                    startTime: Date.now(),
                    finished: false
                });

                const raceEmbed = {
                    color: 0xf39c12,
                    title: '🏃‍♂️ سباق الكلمات',
                    description: `اكتب الكلمات التالية بالترتيب وبأسرع ما يمكن!\n\n**الكلمة الأولى:**\n\`\`\`${raceWords[0]}\`\`\``,
                    fields: [
                        { name: '📊 التقدم', value: `1 / ${wordCount}`, inline: true },
                        { name: '🏆 الهدف', value: 'اكتب جميع الكلمات', inline: true },
                        { name: '⚡ السرعة', value: 'المهمة!', inline: true }
                    ],
                    footer: { text: 'اكتب الكلمة الأولى لبدء السباق!' },
                    timestamp: new Date()
                };

                await interaction.reply({ embeds: [raceEmbed] });
                break;

            case 'لعبة-الذاكرة':
                if (activeGames.has(channelId)) {
                    await interaction.reply({ content: '❌ هناك لعبة نشطة بالفعل في هذه القناة!', ephemeral: true });
                    return;
                }

                const sequenceLength = interaction.options.getInteger('المستوى') || 5;
                const sequence = [];
                for (let i = 0; i < sequenceLength; i++) {
                    sequence.push(Math.floor(Math.random() * 9) + 1);
                }

                activeGames.set(channelId, {
                    type: 'memory',
                    sequence,
                    showTime: 3000,
                    players: new Set(),
                    startTime: Date.now(),
                    phase: 'showing'
                });

                const memoryEmbed = {
                    color: 0x1abc9c,
                    title: '🧠 لعبة اختبار الذاكرة',
                    description: `احفظ التسلسل التالي:\n\n**${sequence.join(' - ')}**\n\nسيختفي بعد 3 ثوان!`,
                    fields: [
                        { name: '📊 الطول', value: `${sequenceLength} أرقام`, inline: true },
                        { name: '⏱️ وقت الحفظ', value: '3 ثوان', inline: true },
                        { name: '🎯 المطلوب', value: 'اكتب التسلسل', inline: true }
                    ],
                    footer: { text: 'احفظ الأرقام جيداً!' },
                    timestamp: new Date()
                };

                await interaction.reply({ embeds: [memoryEmbed] });

                // إخفاء التسلسل بعد 3 ثوان
                setTimeout(async () => {
                    if (activeGames.has(channelId) && activeGames.get(channelId).type === 'memory') {
                        const game = activeGames.get(channelId);
                        game.phase = 'answering';

                        const hiddenEmbed = {
                            color: 0x1abc9c,
                            title: '🧠 لعبة اختبار الذاكرة',
                            description: `الآن اكتب التسلسل الذي رأيته!\n\n**اكتب الأرقام مفصولة بمسافات**\nمثال: 1 2 3 4 5`,
                            fields: [
                                { name: '📊 الطول', value: `${sequenceLength} أرقام`, inline: true },
                                { name: '⏱️ الوقت المتبقي', value: '30 ثانية', inline: true },
                                { name: '🎯 المطلوب', value: 'اكتب التسلسل', inline: true }
                            ],
                            footer: { text: 'اكتب الأرقام مفصولة بمسافات!' },
                            timestamp: new Date()
                        };

                        await interaction.editReply({ embeds: [hiddenEmbed] });

                        // إنهاء اللعبة بعد 30 ثانية
                        setTimeout(() => {
                            if (activeGames.has(channelId) && activeGames.get(channelId).type === 'memory') {
                                activeGames.delete(channelId);
                                interaction.followUp(`⏰ انتهى الوقت! التسلسل الصحيح كان: **${sequence.join(' - ')}**`);
                            }
                        }, 30000);
                    }
                }, 3000);
                break;

            case 'لعبة-ترتيب-الأرقام':
                if (activeGames.has(channelId)) {
                    await interaction.reply({ content: '❌ هناك لعبة نشطة بالفعل في هذه القناة!', ephemeral: true });
                    return;
                }

                const numbersCount = interaction.options.getInteger('عدد_الأرقام') || 8;
                const numbersToSort = [];
                for (let i = 1; i <= numbersCount; i++) {
                    numbersToSort.push(i);
                }
                const shuffledNumbers = shuffleArray(numbersToSort);
                const correctOrder = [...numbersToSort];

                activeGames.set(channelId, {
                    type: 'number-sort',
                    shuffledNumbers,
                    correctOrder,
                    players: new Set(),
                    startTime: Date.now()
                });

                const sortEmbed = {
                    color: 0x34495e,
                    title: '🔢 لعبة ترتيب الأرقام',
                    description: `رتب الأرقام التالية تصاعدياً:\n\n**${shuffledNumbers.join(' - ')}**`,
                    fields: [
                        { name: '📊 العدد', value: `${numbersCount} أرقام`, inline: true },
                        { name: '🎯 المطلوب', value: 'ترتيب تصاعدي', inline: true },
                        { name: '⏱️ الوقت', value: '45 ثانية', inline: true }
                    ],
                    footer: { text: 'اكتب الأرقام مرتبة ومفصولة بمسافات!' },
                    timestamp: new Date()
                };

                await interaction.reply({ embeds: [sortEmbed] });

                // إنهاء اللعبة بعد 45 ثانية
                setTimeout(() => {
                    if (activeGames.has(channelId) && activeGames.get(channelId).type === 'number-sort') {
                        activeGames.delete(channelId);
                        interaction.followUp(`⏰ انتهى الوقت! الترتيب الصحيح: **${correctOrder.join(' - ')}**`);
                    }
                }, 45000);
                break;

            case 'لعبة-احزر-الإيموجي':
                if (activeGames.has(channelId)) {
                    await interaction.reply({ content: '❌ هناك لعبة نشطة بالفعل في هذه القناة!', ephemeral: true });
                    return;
                }

                const emojiType = interaction.options.getString('النوع') || 'movies';
                const emojiData = getRandomElement(gameData.emojis[emojiType]);

                activeGames.set(channelId, {
                    type: 'emoji-guess',
                    emojiData,
                    emojiType,
                    hintsUsed: 0,
                    players: new Set(),
                    startTime: Date.now()
                });

                const emojiEmbed = {
                    color: 0xf1c40f,
                    title: '😄 لعبة احزر الإيموجي',
                    description: `**النوع:** ${emojiType === 'movies' ? 'أفلام' : emojiType === 'countries' ? 'دول' : emojiType === 'animals' ? 'حيوانات' : 'طعام'}\n\n**الإيموجي:**\n${emojiData.emojis}`,
                    fields: [
                        { name: '🎯 المطلوب', value: 'احزر المعنى!', inline: true },
                        { name: '💡 التلميحات', value: '3 متاحة', inline: true },
                        { name: '⏱️ الوقت', value: '90 ثانية', inline: true }
                    ],
                    footer: { text: 'اكتب إجابتك أو "تلميح" للحصول على مساعدة!' },
                    timestamp: new Date()
                };

                await interaction.reply({ embeds: [emojiEmbed] });

                // إنهاء اللعبة بعد 90 ثانية
                setTimeout(() => {
                    if (activeGames.has(channelId) && activeGames.get(channelId).type === 'emoji-guess') {
                        activeGames.delete(channelId);
                        interaction.followUp(`⏰ انتهى الوقت! الإجابة الصحيحة: **${emojiData.answer}**`);
                    }
                }, 90000);
                break;

            case 'لعبة-من-الأسرع':
                if (activeGames.has(channelId)) {
                    await interaction.reply({ content: '❌ هناك لعبة نشطة بالفعل في هذه القناة!', ephemeral: true });
                    return;
                }

                const questionType = interaction.options.getString('النوع') || 'math';
                let fastQuestion;

                if (questionType === 'math') {
                    fastQuestion = getRandomElement(gameData.mathQuestions);
                } else if (questionType === 'language') {
                    fastQuestion = getRandomElement(gameData.languageQuestions);
                } else {
                    fastQuestion = getRandomElement(gameData.logicQuestions);
                }

                activeGames.set(channelId, {
                    type: 'speed-question',
                    question: fastQuestion,
                    questionType,
                    players: new Set(),
                    startTime: Date.now()
                });

                const speedEmbed = {
                    color: 0xe67e22,
                    title: '⚡ لعبة من الأسرع',
                    description: `**النوع:** ${questionType === 'math' ? 'حسابية' : questionType === 'language' ? 'لغوية' : 'منطقية'}\n\n**السؤال:**\n${fastQuestion.question}`,
                    fields: [
                        { name: '🏃‍♂️ الهدف', value: 'أجب أولاً لتفوز!', inline: true },
                        { name: '⏱️ الوقت', value: '30 ثانية', inline: true },
                        { name: '🏆 الجائزة', value: 'مركز أول', inline: true }
                    ],
                    footer: { text: 'اكتب إجابتك بسرعة!' },
                    timestamp: new Date()
                };

                await interaction.reply({ embeds: [speedEmbed] });

                // إنهاء اللعبة بعد 30 ثانية
                setTimeout(() => {
                    if (activeGames.has(channelId) && activeGames.get(channelId).type === 'speed-question') {
                        activeGames.delete(channelId);
                        interaction.followUp(`⏰ انتهى الوقت! الإجابة الصحيحة: **${fastQuestion.answer}**`);
                    }
                }, 30000);
                break;

            case 'لعبة-البحث-المخفي':
                if (activeGames.has(channelId)) {
                    await interaction.reply({ content: '❌ هناك لعبة نشطة بالفعل في هذه القناة!', ephemeral: true });
                    return;
                }

                const gridSize = interaction.options.getString('الحجم') || 'medium';
                const size = gridSize === 'small' ? 8 : gridSize === 'medium' ? 10 : 12;

                // إنشاء شبكة بسيطة للعرض
                const wordsToFind = ['كتاب', 'قلم', 'بيت', 'ماء'];
                const grid = Array(size).fill().map(() => Array(size).fill('◯'));

                // وضع الكلمات في الشبكة (مبسط للعرض)
                for (let i = 0; i < 4; i++) {
                    grid[i][0] = wordsToFind[i][0];
                }

                activeGames.set(channelId, {
                    type: 'word-search',
                    grid,
                    wordsToFind,
                    foundWords: new Set(),
                    players: new Set(),
                    startTime: Date.now()
                });

                const searchEmbed = {
                    color: 0x8e44ad,
                    title: '🔍 لعبة البحث المخفي',
                    description: `**حجم الشبكة:** ${size}x${size}\n\n**الكلمات المطلوبة:**\n${wordsToFind.join(' - ')}\n\n**الشبكة:**\n\`\`\`${grid.slice(0, 5).map(row => row.slice(0, 8).join(' ')).join('\n')}\n...\`\`\``,
                    fields: [
                        { name: '📊 التقدم', value: `0 / ${wordsToFind.length}`, inline: true },
                        { name: '🎯 المطلوب', value: 'اكتب الكلمات', inline: true },
                        { name: '⏱️ الوقت', value: '5 دقائق', inline: true }
                    ],
                    footer: { text: 'اكتب الكلمات التي تجدها!' },
                    timestamp: new Date()
                };

                await interaction.reply({ embeds: [searchEmbed] });

                // إنهاء اللعبة بعد 5 دقائق
                setTimeout(() => {
                    if (activeGames.has(channelId) && activeGames.get(channelId).type === 'word-search') {
                        activeGames.delete(channelId);
                        interaction.followUp(`⏰ انتهى الوقت! الكلمات كانت: **${wordsToFind.join(' - ')}**`);
                    }
                }, 300000);
                break;

            case 'لعبة-الألوان':
                if (activeGames.has(channelId)) {
                    await interaction.reply({ content: '❌ هناك لعبة نشطة بالفعل في هذه القناة!', ephemeral: true });
                    return;
                }

                const sequenceLen = interaction.options.getInteger('الطول') || 6;
                const colorSequence = [];
                for (let i = 0; i < sequenceLen; i++) {
                    colorSequence.push(getRandomElement(gameData.colors));
                }

                activeGames.set(channelId, {
                    type: 'color-sequence',
                    sequence: colorSequence,
                    players: new Set(),
                    startTime: Date.now(),
                    phase: 'showing'
                });

                const colorEmbed = {
                    color: 0x2ecc71,
                    title: '🌈 لعبة الألوان',
                    description: `احفظ تسلسل الألوان:\n\n${colorSequence.join(' ')}\n\nسيختفي بعد 4 ثوان!`,
                    fields: [
                        { name: '📊 الطول', value: `${sequenceLen} ألوان`, inline: true },
                        { name: '⏱️ وقت الحفظ', value: '4 ثوان', inline: true },
                        { name: '🎯 المطلوب', value: 'اكتب التسلسل', inline: true }
                    ],
                    footer: { text: 'احفظ الألوان جيداً!' },
                    timestamp: new Date()
                };

                await interaction.reply({ embeds: [colorEmbed] });

                // إخفاء التسلسل بعد 4 ثوان
                setTimeout(async () => {
                    if (activeGames.has(channelId) && activeGames.get(channelId).type === 'color-sequence') {
                        const game = activeGames.get(channelId);
                        game.phase = 'answering';

                        const hiddenColorEmbed = {
                            color: 0x2ecc71,
                            title: '🌈 لعبة الألوان',
                            description: `الآن اكتب تسلسل الألوان!\n\n**اكتب الرموز مفصولة بمسافات**\nالألوان المتاحة: ${gameData.colors.join(' ')}`,
                            fields: [
                                { name: '📊 الطول', value: `${sequenceLen} ألوان`, inline: true },
                                { name: '⏱️ الوقت المتبقي', value: '40 ثانية', inline: true },
                                { name: '🎯 المطلوب', value: 'اكتب التسلسل', inline: true }
                            ],
                            footer: { text: 'اكتب الألوان مفصولة بمسافات!' },
                            timestamp: new Date()
                        };

                        await interaction.editReply({ embeds: [hiddenColorEmbed] });

                        // إنهاء اللعبة بعد 40 ثانية
                        setTimeout(() => {
                            if (activeGames.has(channelId) && activeGames.get(channelId).type === 'color-sequence') {
                                activeGames.delete(channelId);
                                interaction.followUp(`⏰ انتهى الوقت! التسلسل الصحيح: **${colorSequence.join(' ')}**`);
                            }
                        }, 40000);
                    }
                }, 4000);
                break;

            case 'عجلة-الحظ':
                if (activeGames.has(channelId)) {
                    await interaction.reply({ content: '❌ هناك لعبة نشطة بالفعل في هذه القناة! استخدم `/إنهاء-اللعبة` لإنهائها أولاً.', flags: MessageFlags.Ephemeral });
                    return;
                }

                const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

                const joinWheelButton = new ButtonBuilder()
                    .setCustomId('wheel_join')
                    .setLabel('دخول اللعبة')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('🎯');

                const leaveWheelButton = new ButtonBuilder()
                    .setCustomId('wheel_leave')
                    .setLabel('خروج من اللعبة')
                    .setStyle(ButtonStyle.Danger)
                    .setEmoji('❌');

                const wheelActionRow = new ActionRowBuilder()
                    .addComponents(joinWheelButton, leaveWheelButton);

                activeGames.set(channelId, {
                    type: 'wheel-of-fortune',
                    players: new Set(),
                    phase: 'waiting',
                    gameMessage: null,
                    currentTurn: null,
                    roundNumber: 1,
                    startTime: Date.now(),
                    spinTimeout: null
                });

                const wheelEmbed = {
                    color: 0xff6b35,
                    title: '🎯 عجلة الحظ',
                    description: `@here\n\n🎮 **لعبة عجلة الحظ الجديدة!**\n\n🎡 **المميزات:**\n• عجلة حقيقية تدور مع صورة متحركة\n• اختيار تلقائي عشوائي بعد التدوير\n• تأثيرات بصرية مذهلة\n• مؤثرات صوتية وانيميشن\n\n⏰ **وقت الانضمام: 30 ثانية**`,
                    image: { url: 'https://media.giphy.com/media/3o7btPCcdNniyf0ArS/giphy.gif' },
                    fields: [
                        { name: '👥 اللاعبون', value: 'لا يوجد لاعبون بعد', inline: true },
                        { name: '⏱️ الوقت المتبقي', value: '30 ثانية', inline: true },
                        { name: '🎯 الحد الأدنى', value: '4 لاعبين', inline: true }
                    ],
                    footer: { text: '🎡 اضغط على "دخول اللعبة" للمشاركة في عجلة الحظ!' },
                    timestamp: new Date()
                };

                const gameMessage = await interaction.reply({
                    embeds: [wheelEmbed],
                    components: [wheelActionRow],
                    fetchReply: true
                });

                const game = activeGames.get(channelId);
                game.gameMessage = gameMessage;

                // مؤقت 30 ثانية للانضمام
                setTimeout(async () => {
                    if (!activeGames.has(channelId) || activeGames.get(channelId).type !== 'wheel-of-fortune') return;

                    const currentGame = activeGames.get(channelId);
                    if (currentGame.players.size < 4) {
                        activeGames.delete(channelId);

                        const cancelEmbed = {
                            color: 0xff0000,
                            title: '❌ تم إلغاء اللعبة',
                            description: `لم ينضم عدد كافي من اللاعبين (${currentGame.players.size}/4)\nالحد الأدنى: 4 لاعبين`,
                            image: { url: 'https://media.giphy.com/media/l2JhpjWPccQhsAMfu/giphy.gif' },
                            timestamp: new Date()
                        };

                        await gameMessage.edit({ embeds: [cancelEmbed], components: [] });
                    } else {
                        // بدء اللعبة
                        try {
                            currentGame.phase = 'playing';
                            await startWheelRound(channelId, interaction);
                        } catch (error) {
                            console.error('خطأ في بدء جولة عجلة الحظ:', error);
                            activeGames.delete(channelId);
                            if (gameMessage && gameMessage.edit) {
                                await gameMessage.edit({
                                    content: '❌ حدث خطأ أثناء بدء اللعبة. يرجى المحاولة مرة أخرى.',
                                    embeds: [],
                                    components: []
                                });
                            }
                        }
                    }
                }, 30000);
                break;

            case 'نرد':
                if (activeGames.has(channelId)) {
                    await interaction.reply({ content: '❌ هناك لعبة نشطة بالفعل في هذه القناة! استخدم `/إنهاء-اللعبة` لإنهائها أولاً.', flags: MessageFlags.Ephemeral });
                    return;
                }

                const { ActionRowBuilder: DiceActionRowBuilder, ButtonBuilder: DiceButtonBuilder, ButtonStyle: DiceButtonStyle } = require('discord.js');
                const languageSystemDice = require('./language-system');
                const diceGameTexts = languageSystemDice.getGameTexts(interaction.guildId);

                const diceJoinButton = new DiceButtonBuilder()
                    .setCustomId('dice_join')
                    .setLabel(diceGameTexts.joinGame)
                    .setStyle(DiceButtonStyle.Success)
                    .setEmoji('🎲');

                const diceLeaveButton = new DiceButtonBuilder()
                    .setCustomId('dice_leave')
                    .setLabel(diceGameTexts.leaveGame)
                    .setStyle(DiceButtonStyle.Danger)
                    .setEmoji('❌');

                const diceActionRow = new DiceActionRowBuilder()
                    .addComponents(diceJoinButton, diceLeaveButton);

                activeGames.set(channelId, {
                    type: 'dice',
                    players: new Set(),
                    phase: 'waiting',
                    teams: { team1: [], team2: [] },
                    scores: { team1: 0, team2: 0 },
                    round: 1,
                    maxRounds: 3,
                    currentPlayer: null,
                    gameMessage: null,
                    startTime: Date.now()
                });

                const diceEmbed = {
                    color: 0x00ff00,
                    title: diceGameTexts.diceTitle,
                    description: diceGameTexts.diceDescription,
                    fields: [
                        { name: `👥 ${diceGameTexts.playersCount}`, value: diceGameTexts.noPlayersYet, inline: true },
                        { name: `⏱️ ${diceGameTexts.timeLeft}`, value: `30 ${diceGameTexts.seconds}`, inline: true },
                        { name: `🎯 ${diceGameTexts.status}`, value: diceGameTexts.waitingPlayers, inline: true }
                    ],
                    footer: { text: diceGameTexts.clickToJoin },
                    timestamp: new Date()
                };

                const diceGameMessage = await interaction.reply({
                    embeds: [diceEmbed],
                    components: [diceActionRow],
                    fetchReply: true
                });

                const diceGame = activeGames.get(channelId);
                diceGame.gameMessage = diceGameMessage;

                // مؤقت 30 ثانية للانضمام
                setTimeout(async () => {
                    if (!activeGames.has(channelId) || activeGames.get(channelId).type !== 'dice') return;

                    const currentDiceGame = activeGames.get(channelId);
                    if (currentDiceGame.players.size < 4) {
                        activeGames.delete(channelId);

                        const cancelEmbed = {
                            color: 0xff0000,
                            title: '❌ تم إلغاء اللعبة',
                            description: `لم ينضم عدد كافي من اللاعبين (${currentDiceGame.players.size}/4)\nالحد الأدنى: 4 لاعبين`,
                            timestamp: new Date()
                        };

                        await diceGameMessage.edit({ embeds: [cancelEmbed], components: [] });
                    } else {
                        // تقسيم اللاعبين لفريقين وبدء اللعبة
                        await startDiceGame(channelId, interaction);
                    }
                }, 30000);
                break;

            case 'إنهاء-اللعبة':
                if (!activeGames.has(channelId)) {
                    await interaction.reply({ content: '❌ لا توجد لعبة نشطة في هذه القناة!', flags: MessageFlags.Ephemeral });
                    return;
                }

                activeGames.delete(channelId);

                const endEmbed = {
                    color: 0x95a5a6,
                    title: '🛑 تم إنهاء اللعبة',
                    description: 'تم إنهاء اللعبة النشطة في هذه القناة.',
                    timestamp: new Date()
                };

                await interaction.reply({ embeds: [endEmbed] });
                break;

            case 'إحصائيات-الألعاب':
                const targetUser = interaction.options.getUser('اللاعب') || interaction.user;
                const stats = playerStats.get(targetUser.id) || {
                    gamesPlayed: 0,
                    gamesWon: 0,
                    totalScore: 0,
                    favoriteGame: 'لا يوجد'
                };

                const winRate = stats.gamesPlayed > 0 ? ((stats.gamesWon / stats.gamesPlayed) * 100).toFixed(1) : 0;

                const statsEmbed = {
                    color: 0x3498db,
                    title: `📊 إحصائيات الألعاب - ${targetUser.username}`,
                    thumbnail: { url: targetUser.displayAvatarURL({ dynamic: true }) },
                    fields: [
                        { name: '🎮 الألعاب الممارسة', value: `${stats.gamesPlayed}`, inline: true },
                        { name: '🏆 الألعاب المكسوبة', value: `${stats.gamesWon}`, inline: true },
                        { name: '📈 معدل الفوز', value: `${winRate}%`, inline: true },
                        { name: '⭐ النقاط الإجمالية', value: `${stats.totalScore}`, inline: true },
                        { name: '❤️ اللعبة المفضلة', value: stats.favoriteGame, inline: true },
                        { name: '🎯 الرتبة', value: stats.totalScore > 1000 ? 'خبير' : stats.totalScore > 500 ? 'متقدم' : stats.totalScore > 100 ? 'متوسط' : 'مبتدئ', inline: true }
                    ],
                    footer: { text: 'العب أكثر لتحسين إحصائياتك!' },
                    timestamp: new Date()
                };

                await interaction.reply({ embeds: [statsEmbed] });
                break;

            case 'قائمة-الألعاب':
                const gamesListEmbed = {
                    color: 0x9b59b6,
                    title: '🎮 قائمة الألعاب الجماعية',
                    description: 'جميع الألعاب المتاحة للعب في البوت:',
                    fields: [
                        {
                            name: '🎲 ألعاب التخمين',
                            value: '• `/لعبة-تخمين-الرقم`\n• `/لعبة-كلمة-سر`\n• `/لعبة-احزر-الإيموجي`',
                            inline: true
                        },
                        {
                            name: '🧠 ألعاب الذكاء',
                            value: '• `/لعبة-الأسئلة`\n• `/لعبة-الذاكرة`\n• `/لعبة-من-الأسرع`',
                            inline: true
                        },
                        {
                            name: '⚡ ألعاب السرعة',
                            value: '• `/لعبة-سباق-الكلمات`\n• `/لعبة-ترتيب-الأرقام`\n• `/لعبة-الألوان`',
                            inline: true
                        },
                        {
                            name: '🔍 ألعاب أخرى',
                            value: '• `/لعبة-البحث-المخفي`\n• `/لعبة-روليت`',
                            inline: true
                        },
                        {
                            name: '⚙️ أوامر التحكم',
                            value: '• `/إنهاء-اللعبة`\n• `/إحصائيات-الألعاب`',
                            inline: true
                        }
                    ],
                    footer: { text: 'استمتع باللعب مع أصدقائك!' },
                    timestamp: new Date()
                };

                await interaction.reply({ embeds: [gamesListEmbed] });
                break;

            default:
                return false;
        }
        return true;
    } catch (error) {
        console.error('خطأ في نظام الألعاب:', error);
        throw error;
    }
}

// دالة بدء لعبة النرد
async function startDiceGame(channelId, interaction) {
    const game = activeGames.get(channelId);
    if (!game || game.type !== 'dice') return;

    // تقسيم اللاعبين لفريقين
    const playersArray = Array.from(game.players);
    const shuffledPlayers = shuffleArray(playersArray);

    const team1Size = Math.ceil(shuffledPlayers.length / 2);
    game.teams.team1 = shuffledPlayers.slice(0, team1Size);
    game.teams.team2 = shuffledPlayers.slice(team1Size);

    // إعداد نقاط الفرق
    game.teams.team1.forEach(player => {
        if (!game.scores[player]) game.scores[player] = 0;
    });
    game.teams.team2.forEach(player => {
        if (!game.scores[player]) game.scores[player] = 0;
    });

    game.phase = 'playing';

    // عرض الفرق
    const team1Text = game.teams.team1.map(id => `<@${id}>`).join('\n');
    const team2Text = game.teams.team2.map(id => `<@${id}>`).join('\n');

    await game.gameMessage.edit({
        content: `🎲 **بدأت لعبة النرد!**\n\n⚔️ **الجولة ${game.round}/${game.maxRounds}**\n\n🔴 **الفريق الأول:**\n${team1Text}\n\n🔵 **الفريق الثاني:**\n${team2Text}\n\n🏁 **جاري البدء...**`,
        embeds: [],
        components: []
    });

    // بدء الجولة الأولى بعد 3 ثوان
    setTimeout(() => {
        if (!activeGames.has(channelId) || activeGames.get(channelId).type !== 'dice') return;
        startDiceRound(channelId, interaction);
    }, 3000);
}

// دالة بدء جولة النرد
async function startDiceRound(channelId, interaction) {
    const game = activeGames.get(channelId);
    if (!game || game.type !== 'dice' || game.phase !== 'playing') return;

    // ترتيب اللاعبين للجولة (فريق أول ثم ثاني بالتناوب)
    const roundPlayers = [];
    const maxTeamSize = Math.max(game.teams.team1.length, game.teams.team2.length);

    for (let i = 0; i < maxTeamSize; i++) {
        if (game.teams.team1[i]) roundPlayers.push(game.teams.team1[i]);
        if (game.teams.team2[i]) roundPlayers.push(game.teams.team2[i]);
    }

    game.currentPlayers = roundPlayers;
    game.currentPlayerIndex = 0;

    // بدء دور أول لاعب
    await nextPlayerTurn(channelId, interaction);
}

// دالة دور اللاعب التالي
async function nextPlayerTurn(channelId, interaction) {
    const game = activeGames.get(channelId);
    if (!game || game.type !== 'dice') return;

    if (game.currentPlayerIndex >= game.currentPlayers.length) {
        // انتهت الجولة
        await endDiceRound(channelId, interaction);
        return;
    }

    const currentPlayer = game.currentPlayers[game.currentPlayerIndex];
    game.currentPlayer = currentPlayer;

    // اختيار نرد عشوائي
    const diceResult = getRandomElement(gameData.diceImages);
    game.currentDice = diceResult;

    const { ActionRowBuilder: DiceActionRowBuilder, ButtonBuilder: DiceButtonBuilder, ButtonStyle: DiceButtonStyle } = require('discord.js');

    let buttons = [];

    if (diceResult.type === 'normal' || diceResult.type === 'bonus') {
        // أزرار عادية
        buttons = [
            new DiceButtonBuilder()
                .setCustomId('dice_skip')
                .setLabel('تخطي')
                .setStyle(DiceButtonStyle.Secondary)
                .setEmoji('⏭️'),
            new DiceButtonBuilder()
                .setCustomId('dice_retry')
                .setLabel('حاول مرة أخرى')
                .setStyle(DiceButtonStyle.Primary)
                .setEmoji('🔄')
        ];
    } else if (diceResult.type === 'penalty') {
        // أزرار خاصة للعقوبة
        buttons = [
            new DiceButtonBuilder()
                .setCustomId('dice_skip')
                .setLabel('تخطي')
                .setStyle(DiceButtonStyle.Secondary)
                .setEmoji('⏭️'),
            new DiceButtonBuilder()
                .setCustomId('dice_retry')
                .setLabel('حاول مرة أخرى')
                .setStyle(DiceButtonStyle.Danger)
                .setEmoji('🔄')
        ];
    } else {
        // أزرار للحظر والأمان
        buttons = [
            new DiceButtonBuilder()
                .setCustomId('dice_skip')
                .setLabel('تخطي')
                .setStyle(DiceButtonStyle.Secondary)
                .setEmoji('⏭️')
        ];
    }

    const diceActionRow = new DiceActionRowBuilder().addComponents(buttons);

    // تحديد الفريق
    const playerTeam = game.teams.team1.includes(currentPlayer) ? 'الفريق الأول 🔴' : 'الفريق الثاني 🔵';

    await interaction.channel.send({
        content: `<@${currentPlayer}> **دورك!** (${playerTeam})\n\n🎲 **الجولة ${game.round}/${game.maxRounds}**`,
        files: [{ attachment: diceResult.url, name: 'dice.png' }],
        components: [diceActionRow]
    });
}

// دالة انتهاء جولة النرد
async function endDiceRound(channelId, interaction) {
    const game = activeGames.get(channelId);
    if (!game || game.type !== 'dice') return;

    // حساب نقاط الفرق
    let team1Score = 0;
    let team2Score = 0;

    game.teams.team1.forEach(player => {
        team1Score += game.scores[player] || 0;
    });

    game.teams.team2.forEach(player => {
        team2Score += game.scores[player] || 0;
    });

    game.scores.team1 = team1Score;
    game.scores.team2 = team2Score;

    // عرض نتائج الجولة
    const team1Players = game.teams.team1.map(id => `<@${id}> (${game.scores[id] || 0})`).join('\n');
    const team2Players = game.teams.team2.map(id => `<@${id}> (${game.scores[id] || 0})`).join('\n');

    await interaction.channel.send({
        content: `📊 **نتائج الجولة ${game.round}:**\n\n🔴 **الفريق الأول: ${team1Score} نقطة**\n${team1Players}\n\n🔵 **الفريق الثاني: ${team2Score} نقطة**\n${team2Players}\n\n${team1Score > team2Score ? '🏆 الفريق الأول في المقدمة!' : team2Score > team1Score ? '🏆 الفريق الثاني في المقدمة!' : '🤝 تعادل!'}`
    });

    if (game.round >= game.maxRounds) {
        // انتهت اللعبة
        setTimeout(() => {
            endDiceGame(channelId, interaction);
        }, 5000);
    } else {
        // جولة جديدة
        game.round++;
        setTimeout(() => {
            if (!activeGames.has(channelId) || activeGames.get(channelId).type !== 'dice') return;
            startDiceRound(channelId, interaction);
        }, 8000);
    }
}

// دالة انتهاء لعبة النرد
async function endDiceGame(channelId, interaction) {
    const game = activeGames.get(channelId);
    if (!game || game.type !== 'dice') return;

    const team1Score = game.scores.team1;
    const team2Score = game.scores.team2;

    let winnerText = '';
    if (team1Score > team2Score) {
        winnerText = `🏆 **الفريق الأول هو الفائز!**\n🔴 **النقاط النهائية:** ${team1Score}\n\n**أعضاء الفريق الفائز:**\n${game.teams.team1.map(id => `<@${id}>`).join('\n')}`;
    } else if (team2Score > team1Score) {
        winnerText = `🏆 **الفريق الثاني هو الفائز!**\n🔵 **النقاط النهائية:** ${team2Score}\n\n**أعضاء الفريق الفائز:**\n${game.teams.team2.map(id => `<@${id}>`).join('\n')}`;
    } else {
        winnerText = `🤝 **تعادل!**\n**النقاط النهائية:** ${team1Score} - ${team2Score}`;
    }

    await interaction.channel.send({
        content: `🎉 **انتهت لعبة النرد!**\n\n${winnerText}\n\n🎲 شكراً لجميع المشاركين!`
    });

    activeGames.delete(channelId);
}

// دالة بدء جولة عجلة الحظ
async function startWheelRound(channelId, interaction) {
    const game = activeGames.get(channelId);
    if (!game || game.type !== 'wheel-of-fortune' || game.phase !== 'playing') return;

    const playersArray = Array.from(game.players);
    if (playersArray.length <= 1) {
        // اللعبة انتهت، هناك فائز
        const winner = playersArray[0];
        game.phase = 'finished';
        activeGames.delete(channelId);

        const winnerEmbed = {
            color: 0x00ff00,
            title: '🏆 الفائز في عجلة الحظ!',
            description: `تهانينا! <@${winner}> هو الفائز في عجلة الحظ! 🎉`,
            image: { url: 'https://media.giphy.com/media/26u4cqiYI30juCOGY/giphy.gif' },
            fields: [
                { name: '👑 الفائز', value: `<@${winner}>`, inline: true },
                { name: '🎯 الجولة', value: `${game.roundNumber}`, inline: true },
                { name: '🏅 المكافأة', value: 'مجد وشرف!', inline: true }
            ],
            footer: { text: '🎡 شكراً لجميع المشاركين في عجلة الحظ!' },
            timestamp: new Date()
        };

        await game.gameMessage.edit({ 
            embeds: [winnerEmbed], 
            components: [] 
        });
        return;
    }

    // عرض العجلة مع أسماء اللاعبين
    const playersText = playersArray.map((player, index) => `${index + 1}. <@${player}>`).join('\n');

    // مرحلة 1: عرض اللاعبين وبدء التدوير
    const spinStartEmbed = {
        color: 0xff6b35,
        title: '🎡 عجلة الحظ تدور!',
        description: `**الجولة ${game.roundNumber}**\n\n👥 **اللاعبون المتبقون:**\n${playersText}\n\n🎯 **العجلة تستعد للدوران...**`,
        image: { url: 'https://media.giphy.com/media/3o7btPCcdNniyf0ArS/giphy.gif' },
        fields: [
            { name: '🎲 الجولة', value: `${game.roundNumber}`, inline: true },
            { name: '👥 عدد اللاعبين', value: `${game.players.size}`, inline: true },
            { name: '⏱️ الحالة', value: 'جاري التدوير...', inline: true }
        ],
        footer: { text: '🎡 العجلة تدور لاختيار اللاعب المحظوظ...' },
        timestamp: new Date()
    };

    await game.gameMessage.edit({
        embeds: [spinStartEmbed],
        components: []
    });

    // مرحلة 2: تدوير سريع (3 ثواني)
    setTimeout(async () => {
        if (!activeGames.has(channelId)) return;
        
        const fastSpinEmbed = {
            color: 0xff4500,
            title: '🌪️ العجلة تدور بسرعة!',
            description: `**الجولة ${game.roundNumber}**\n\n${playersText}\n\n⚡ **العجلة تدور بسرعة البرق!**`,
            image: { url: 'https://media.giphy.com/media/xT9IgzoKnwFNmISR8I/giphy.gif' },
            footer: { text: '⚡ العجلة تدور بسرعة مذهلة...' },
            timestamp: new Date()
        };

        await game.gameMessage.edit({ embeds: [fastSpinEmbed] });
    }, 3000);

    // مرحلة 3: تبطيء التدوير (3 ثواني إضافية)
    setTimeout(async () => {
        if (!activeGames.has(channelId)) return;
        
        const slowSpinEmbed = {
            color: 0xffa500,
            title: '🎯 العجلة تبطئ...',
            description: `**الجولة ${game.roundNumber}**\n\n${playersText}\n\n🔥 **العجلة تبطئ... من سيكون المحظوظ؟**`,
            image: { url: 'https://media.giphy.com/media/l0HlBO7eyXzSZkJri/giphy.gif' },
            footer: { text: '🎯 العجلة تبطئ... التشويق يزداد!' },
            timestamp: new Date()
        };

        await game.gameMessage.edit({ embeds: [slowSpinEmbed] });
    }, 6000);

    // مرحلة 4: توقف العجلة واختيار اللاعب (3 ثواني إضافية)
    setTimeout(async () => {
        if (!activeGames.has(channelId)) return;
        
        // اختيار لاعب عشوائي
        const selectedPlayer = getRandomElement(playersArray);
        
        const stopEmbed = {
            color: 0x32cd32,
            title: '🎲 العجلة توقفت!',
            description: `**الجولة ${game.roundNumber}**\n\n🎯 **اختارت العجلة:** <@${selectedPlayer}>\n\n⏰ **وقت الاختيار: 15 ثانية**\n💭 اختر شخص لطرده من اللعبة!`,
            image: { url: 'https://i.imgur.com/wheel_stopped.png' },
            fields: [
                { name: '🎲 اللاعب المختار', value: `<@${selectedPlayer}>`, inline: true },
                { name: '⏱️ الوقت المتبقي', value: '15 ثانية', inline: true },
                { name: '🎯 المطلوب', value: 'اختيار شخص للطرد', inline: true }
            ],
            footer: { text: '🎯 اختر شخص لطرده من اللعبة!' },
            timestamp: new Date()
        };

        // إنشاء أزرار للاعبين الآخرين
        const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
        
        const otherPlayers = playersArray.filter(player => player !== selectedPlayer);
        const buttons = otherPlayers.map(player => 
            new ButtonBuilder()
                .setCustomId(`wheel_eliminate_${player}`)
                .setLabel(interaction.guild.members.cache.get(player)?.user.username || 'لاعب')
                .setStyle(ButtonStyle.Danger)
                .setEmoji('💀')
        );

        // إضافة زر الانسحاب
        buttons.push(
            new ButtonBuilder()
                .setCustomId('wheel_quit')
                .setLabel('انسحاب')
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('🚪')
        );

        const actionRows = [];
        for (let i = 0; i < buttons.length; i += 5) {
            const row = new ActionRowBuilder().addComponents(buttons.slice(i, i + 5));
            actionRows.push(row);
        }

        game.currentTurn = selectedPlayer;
        
        await game.gameMessage.edit({
            content: `<@${selectedPlayer}> **دورك! اختر شخص لطرده من اللعبة!**`,
            embeds: [stopEmbed],
            components: actionRows
        });

        // مؤقت 15 ثانية للاختيار
        game.spinTimeout = setTimeout(async () => {
            if (!activeGames.has(channelId) || activeGames.get(channelId).type !== 'wheel-of-fortune') return;

            // طرد الشخص الذي لم يختر
            game.players.delete(selectedPlayer);

            const timeoutEmbed = {
                color: 0xff0000,
                title: '⏰ انتهى الوقت!',
                description: `<@${selectedPlayer}> لم يختر في الوقت المحدد!\n\n💥 **تم طرده من اللعبة تلقائياً!**`,
                image: { url: 'https://media.giphy.com/media/l2JhpjWPccQhsAMfu/giphy.gif' },
                fields: [
                    { name: '⏰ السبب', value: 'انتهاء الوقت', inline: true },
                    { name: '👥 اللاعبون المتبقون', value: `${game.players.size}`, inline: true },
                    { name: '🎯 الجولة التالية', value: 'خلال 5 ثوان', inline: true }
                ],
                timestamp: new Date()
            };

            await game.gameMessage.edit({ 
                content: '', 
                embeds: [timeoutEmbed], 
                components: [] 
            });

            // جولة جديدة بعد 5 ثوان
            setTimeout(() => {
                if (!activeGames.has(channelId) || activeGames.get(channelId).type !== 'wheel-of-fortune') return;
                game.roundNumber++;
                startWheelRound(channelId, interaction);
            }, 5000);
        }, 15000);
    }, 9000);
}

// دالة بدء جولة روليت (للحفاظ على التوافق)
async function startRouletteRound(channelId, interaction) {
    const game = activeGames.get(channelId);
    if (!game || game.type !== 'roulette' || game.phase !== 'playing') return;

    const playersArray = Array.from(game.players);
    if (playersArray.length <= 1) {
        // اللعبة انتهت، هناك فائز
        const winner = playersArray[0];
        game.phase = 'finished';
        activeGames.delete(channelId);

        await game.gameMessage.edit({ 
            content: `🎉 **الفائز!**\n\n<@${winner}> هو الفائز في لعبة الروليت! 🏆`, 
            embeds: [], 
            components: [] 
        });
        return;
    }

    // اختيار لاعب عشوائي
    const randomPlayer = getRandomElement(playersArray);
    game.currentTurn = randomPlayer;

    const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

    // إضافة أزرار الطرد والأزرار الجديدة
    const voteButtons = playersArray
        .filter(player => player !== randomPlayer) // استبعاد الشخص نفسه
        .map(player =>
            new ButtonBuilder()
                .setCustomId(`roulette_vote_${player}`)
                .setLabel(interaction.guild.members.cache.get(player)?.user.username || 'لاعب')
                .setStyle(ButtonStyle.Secondary)
        );

    // إضافة أزرار عشوائي وانسحاب
    const randomButton = new ButtonBuilder()
        .setCustomId('roulette_random')
        .setLabel('عشوائي')
        .setStyle(ButtonStyle.Primary)
        .setEmoji('🎲');

    const quitButton = new ButtonBuilder()
        .setCustomId('roulette_quit')
        .setLabel('انسحاب')
        .setStyle(ButtonStyle.Danger)
        .setEmoji('🚪');

    const allButtons = [...voteButtons, randomButton, quitButton];

    const actionRow1 = new ActionRowBuilder().addComponents(allButtons.slice(0, 5));
    const actionRow2 = new ActionRowBuilder().addComponents(allButtons.slice(5, 10));

    await game.gameMessage.edit({
        content: `<@${randomPlayer}> **لديك 20 ثانية لاختيار شخص لطرده!**\n\n⚔️ **جولة ${game.roundNumber}**\n👥 **اللاعبون المتبقون:** ${game.players.size}\n\n⏰ إذا لم تتفاعل خلال 20 ثانية سيتم طردك من الفعالية!`,
        embeds: [],
        components: [actionRow1, ...(actionRow2.components.length > 0 ? [actionRow2] : [])]
    });

    // بدء التصويت - طرد الشخص إذا لم يتفاعل
    game.votingTimeout = setTimeout(async () => {
        if (!activeGames.has(channelId) || activeGames.get(channelId).type !== 'roulette') return;

        // طرد الشخص الذي لم يتفاعل
        game.players.delete(randomPlayer);

        await game.gameMessage.edit({ 
            content: `⏰ **انتهى الوقت!**\n\n<@${randomPlayer}> تم طرده من الفعالية لعدم التفاعل!\n\n👥 **اللاعبون المتبقون:** ${game.players.size}`, 
            embeds: [], 
            components: [] 
        });

        // جولة جديدة بعد 6 ثوان
        setTimeout(() => {
            if (!activeGames.has(channelId) || activeGames.get(channelId).type !== 'roulette') return;
            game.roundNumber++;
            startRouletteRound(channelId, interaction);
        }, 6000);
    }, 20000);
}

// دالة معالجة الرسائل للألعاب
async function handleGameMessage(message) {
    const channelId = message.channel.id;
    const userId = message.author.id;
    const content = message.content.trim();

    if (!activeGames.has(channelId)) return false;

    const game = activeGames.get(channelId);

    // تحديث إحصائيات اللاعب
    if (!playerStats.has(userId)) {
        playerStats.set(userId, {
            gamesPlayed: 0,
            gamesWon: 0,
            totalScore: 0,
            favoriteGame: 'لا يوجد'
        });
    }

    try {
        switch (game.type) {
            case 'number-guess':
                const guess = parseInt(content);
                if (isNaN(guess)) return false;

                game.attempts++;
                game.players.add(userId);

                if (guess === game.targetNumber) {
                    activeGames.delete(channelId);

                    // تحديث إحصائيات الفائز
                    const stats = playerStats.get(userId);
                    stats.gamesPlayed++;
                    stats.gamesWon++;
                    stats.totalScore += 50;

                    const winEmbed = {
                        color: 0x00ff00,
                        title: '🎉 فوز!',
                        description: `تهانينا ${message.author}! لقد خمنت الرقم الصحيح **${game.targetNumber}**`,
                        fields: [
                            { name: '🎯 الرقم', value: `${game.targetNumber}`, inline: true },
                            { name: '🔢 المحاولات', value: `${game.attempts}`, inline: true },
                            { name: '⏱️ الوقت', value: `${Math.round((Date.now() - game.startTime) / 1000)} ثانية`, inline: true }
                        ],
                        timestamp: new Date()
                    };

                    await message.reply({ embeds: [winEmbed] });
                } else {
                    const hint = guess < game.targetNumber ? 'أعلى ⬆️' : 'أقل ⬇️';
                    await message.react(guess < game.targetNumber ? '⬆️' : '⬇️');

                    if (game.attempts % 5 === 0) {
                        await message.channel.send(`💡 تلميح: الرقم ${hint} من ${guess}`);
                    }
                }
                break;

            case 'question':
                const answer = normalizeText(content);
                const correctAnswers = game.question.answers.map(a => normalizeText(a));

                if (correctAnswers.includes(answer)) {
                    activeGames.delete(channelId);

                    const stats = playerStats.get(userId);
                    stats.gamesPlayed++;
                    stats.gamesWon++;
                    stats.totalScore += 30;

                    const correctEmbed = {
                        color: 0x00ff00,
                        title: '✅ إجابة صحيحة!',
                        description: `أحسنت ${message.author}! الإجابة صحيحة: **${game.question.correct}**`,
                        fields: [
                            { name: '❓ السؤال', value: game.question.question, inline: false },
                            { name: '⏱️ الوقت', value: `${Math.round((Date.now() - game.startTime) / 1000)} ثانية`, inline: true }
                        ],
                        timestamp: new Date()
                    };

                    await message.reply({ embeds: [correctEmbed] });
                }
                break;

            case 'word-guess':
                if (content.length !== 1 || !/[\u0600-\u06FF]/.test(content)) return false;

                const letter = normalizeText(content);
                if (game.guessedLetters.has(letter)) {
                    await message.react('🔄');
                    return true;
                }

                game.guessedLetters.add(letter);

                if (game.secretWord.includes(letter)) {
                    // حرف صحيح
                    await message.react('✅');

                    // تحديث الكلمة المخفية
                    let newHiddenWord = '';
                    for (let i = 0; i < game.secretWord.length; i++) {
                        if (game.guessedLetters.has(game.secretWord[i])) {
                            newHiddenWord += game.secretWord[i] + ' ';
                        } else {
                            newHiddenWord += '_ ';
                        }
                    }
                    game.hiddenWord = newHiddenWord.trim();

                    // فحص الفوز
                    if (!game.hiddenWord.includes('_')) {
                        activeGames.delete(channelId);

                        const stats = playerStats.get(userId);
                        stats.gamesPlayed++;
                        stats.gamesWon++;
                        stats.totalScore += 40;

                        const wordWinEmbed = {
                            color: 0x00ff00,
                            title: '🎉 ممتاز!',
                            description: `لقد حزرت الكلمة: **${game.secretWord}**`,
                            timestamp: new Date()
                        };

                        await message.reply({ embeds: [wordWinEmbed] });
                    }
                } else {
                    // حرف خاطئ
                    await message.react('❌');
                    game.wrongGuesses++;

                    if (game.wrongGuesses >= game.maxWrongGuesses) {
                        activeGames.delete(channelId);

                        const gameOverEmbed = {
                            color: 0xff0000,
                            title: '💀 انتهت المحاولات',
                            description: `الكلمة كانت: **${game.secretWord}**`,
                            timestamp: new Date()
                        };

                        await message.reply({ embeds: [gameOverEmbed] });
                    }
                }
                break;

            case 'word-race':
                if (normalizeText(content) === normalizeText(game.words[game.currentIndex])) {
                    game.currentIndex++;

                    if (!game.players.has(userId)) {
                        game.players.set(userId, { wordsCompleted: 0, startTime: Date.now() });
                    }

                    game.players.get(userId).wordsCompleted++;

                    if (game.currentIndex >= game.words.length) {
                        // اللعبة انتهت
                        activeGames.delete(channelId);

                        const stats = playerStats.get(userId);
                        stats.gamesPlayed++;
                        stats.gamesWon++;
                        stats.totalScore += 60;

                        const raceWinEmbed = {
                            color: 0x00ff00,
                            title: '🏆 فائز السباق!',
                            description: `${message.author} أنهى السباق أولاً!`,
                            fields: [
                                { name: '⏱️ الوقت', value: `${Math.round((Date.now() - game.startTime) / 1000)} ثانية`, inline: true },
                                { name: '📝 الكلمات', value: `${game.words.length}`, inline: true }
                            ],
                            timestamp: new Date()
                        };

                        await message.reply({ embeds: [raceWinEmbed] });
                    } else {
                        await message.react('✅');
                        await message.channel.send(`**الكلمة التالية:** \`${game.words[game.currentIndex]}\``);
                    }
                }
                break;

            case 'memory':
                if (game.phase !== 'answering') return false;

                const userSequence = content.split(' ').map(num => parseInt(num.trim()));
                const correctSequence = game.sequence;

                if (userSequence.length === correctSequence.length && 
                    userSequence.every((num, index) => num === correctSequence[index])) {

                    activeGames.delete(channelId);

                    const stats = playerStats.get(userId);
                    stats.gamesPlayed++;
                    stats.gamesWon++;
                    stats.totalScore += 45;

                    const memoryWinEmbed = {
                        color: 0x00ff00,
                        title: '🧠 ذاكرة ممتازة!',
                        description: `${message.author} تذكر التسلسل بشكل صحيح!`,
                        fields: [
                            { name: '🔢 التسلسل', value: correctSequence.join(' - '), inline: false },
                            { name: '⏱️ الوقت', value: `${Math.round((Date.now() - game.startTime) / 1000)} ثانية`, inline: true }
                        ],
                        timestamp: new Date()
                    };

                    await message.reply({ embeds: [memoryWinEmbed] });
                } else {
                    await message.react('❌');
                }
                break;

            case 'number-sort':
                const sortedNumbers = content.split(' ').map(num => parseInt(num.trim()));

                if (sortedNumbers.length === game.correctOrder.length && 
                    sortedNumbers.every((num, index) => num === game.correctOrder[index])) {

                    activeGames.delete(channelId);

                    const stats = playerStats.get(userId);
                    stats.gamesPlayed++;
                    stats.gamesWon++;
                    stats.totalScore += 35;

                    const sortWinEmbed = {
                        color: 0x00ff00,
                        title: '🔢 ترتيب مثالي!',
                        description: `${message.author} رتب الأرقام بشكل صحيح!`,
                        timestamp: new Date()
                    };

                    await message.reply({ embeds: [sortWinEmbed] });
                } else {
                    await message.react('❌');
                }
                break;

            case 'emoji-guess':
                const normalizedContent = normalizeText(content);
                if (normalizedContent === 'تلميح' || normalizedContent === 'hint' || normalizedContent === 'تلميحه') {
                    if (game.hintsUsed < game.emojiData.hints.length) {
                        const hint = game.emojiData.hints[game.hintsUsed];
                        game.hintsUsed++;

                        await message.reply(`💡 **تلميح ${game.hintsUsed}:** ${hint}`);
                    } else {
                        await message.reply('❌ لا توجد تلميحات أخرى!');
                    }
                } else if (normalizedContent.includes(normalizeText(game.emojiData.answer)) ||
                          normalizeText(game.emojiData.answer).includes(normalizedContent)) {

                    activeGames.delete(channelId);

                    const stats = playerStats.get(userId);
                    stats.gamesPlayed++;
                    stats.gamesWon++;
                    stats.totalScore += Math.max(50 - (game.hintsUsed * 10), 20);

                    const emojiWinEmbed = {
                        color: 0x00ff00,
                        title: '😄 إجابة صحيحة!',
                        description: `${message.author} حزر الإيموجي بنجاح!`,
                        fields: [
                            { name: '🎯 الإجابة', value: game.emojiData.answer, inline: true },
                            { name: '💡 التلميحات المستخدمة', value: `${game.hintsUsed}`, inline: true }
                        ],
                        timestamp: new Date()
                    };

                    await message.reply({ embeds: [emojiWinEmbed] });
                }
                break;

            case 'speed-question':
                if (normalizeText(content) === normalizeText(game.question.answer)) {
                    activeGames.delete(channelId);

                    const stats = playerStats.get(userId);
                    stats.gamesPlayed++;
                    stats.gamesWon++;
                    const timeBonus = Math.max(100 - Math.round((Date.now() - game.startTime) / 100), 20);
                    stats.totalScore += timeBonus;

                    const speedWinEmbed = {
                        color: 0x00ff00,
                        title: '⚡ سرعة البرق!',
                        description: `${message.author} أجاب بسرعة فائقة!`,
                        fields: [
                            { name: '⏱️ الوقت', value: `${Math.round((Date.now() - game.startTime) / 1000)} ثانية`, inline: true },
                            { name: '🏆 نقاط إضافية', value: `+${timeBonus}`, inline: true }
                        ],
                        timestamp: new Date()
                    };

                    await message.reply({ embeds: [speedWinEmbed] });
                }
                break;

            case 'word-search':
                const foundWord = normalizeText(content);
                if (game.wordsToFind.some(word => normalizeText(word) === foundWord)) {
                    if (!game.foundWords.has(foundWord)) {
                        game.foundWords.add(foundWord);
                        await message.react('✅');

                        if (game.foundWords.size === game.wordsToFind.length) {
                            activeGames.delete(channelId);

                            const stats = playerStats.get(userId);
                            stats.gamesPlayed++;
                            stats.gamesWon++;
                            stats.totalScore += 55;

                            const searchWinEmbed = {
                                color: 0x00ff00,
                                title: '🔍 عثور كامل!',
                                description: `${message.author} وجد جميع الكلمات!`,
                                timestamp: new Date()
                            };

                            await message.reply({ embeds: [searchWinEmbed] });
                        }
                    } else {
                        await message.react('🔄');
                    }
                }
                break;

            case 'color-sequence':
                if (game.phase !== 'answering') return false;

                const userColors = content.split(' ');
                const correctColors = game.sequence;

                if (userColors.length === correctColors.length && 
                    userColors.every((color, index) => color === correctColors[index])) {

                    activeGames.delete(channelId);

                    const stats = playerStats.get(userId);
                    stats.gamesPlayed++;
                    stats.gamesWon++;
                    stats.totalScore += 50;

                    const colorWinEmbed = {
                        color: 0x00ff00,
                        title: '🌈 ألوان مثالية!',
                        description: `${message.author} تذكر تسلسل الألوان بشكل صحيح!`,
                        fields: [
                            { name: '🎨 التسلسل', value: correctColors.join(' '), inline: false }
                        ],
                        timestamp: new Date()
                    };

                    await message.reply({ embeds: [colorWinEmbed] });
                } else {
                    await message.react('❌');
                }
                break;

            case 'roulette':
                // لا يتم معالجة الرسائل في لعبة الروليت مباشرة
                return false;
        }

        return true;
    } catch (error) {
        console.error('خطأ في معالجة رسالة اللعبة:', error);
        return false;
    }
}

// دالة معالجة أزرار عجلة الحظ
async function handleWheelButton(interaction) {
    const channelId = interaction.channel.id;
    const userId = interaction.user.id;

    if (!activeGames.has(channelId) || activeGames.get(channelId).type !== 'wheel-of-fortune') {
        await interaction.reply({ content: '❌ لا توجد لعبة عجلة حظ نشطة في هذه القناة!', flags: MessageFlags.Ephemeral });
        return;
    }

    const game = activeGames.get(channelId);

    if (interaction.customId === 'wheel_join') {
        if (game.phase !== 'waiting') {
            await interaction.reply({ content: '❌ اللعبة بدأت بالفعل! لا يمكنك الانضمام الآن.', flags: MessageFlags.Ephemeral });
            return;
        }

        if (game.players.has(userId)) {
            await interaction.reply({ content: '❌ أنت مشارك في اللعبة بالفعل!', flags: MessageFlags.Ephemeral });
            return;
        }

        game.players.add(userId);

        const playersText = Array.from(game.players).map(id => `<@${id}>`).join('\n');

        const updatedEmbed = {
            color: 0xff6b35,
            title: '🎯 عجلة الحظ',
            description: `@here\n\n🎮 **لعبة عجلة الحظ الجديدة!**\n\n🎡 **المميزات:**\n• عجلة حقيقية تدور مع صورة متحركة\n• اختيار تلقائي عشوائي بعد التدوير\n• تأثيرات بصرية مذهلة\n• مؤثرات صوتية وانيميشن\n\n⏰ **وقت الانضمام: 30 ثانية**`,
            image: { url: 'https://media.giphy.com/media/3o7btPCcdNniyf0ArS/giphy.gif' },
            fields: [
                { name: `👥 اللاعبون (${game.players.size})`, value: playersText, inline: true },
                { name: '⏱️ الوقت المتبقي', value: '30 ثانية', inline: true },
                { name: '🎯 الحد الأدنى', value: '4 لاعبين', inline: true }
            ],
            footer: { text: '🎡 اضغط على "دخول اللعبة" للمشاركة في عجلة الحظ!' },
            timestamp: new Date()
        };

        await interaction.update({ embeds: [updatedEmbed] });

    } else if (interaction.customId === 'wheel_leave') {
        if (game.phase !== 'waiting') {
            await interaction.reply({ content: '❌ اللعبة بدأت بالفعل! لا يمكنك الخروج الآن.', flags: MessageFlags.Ephemeral });
            return;
        }

        if (!game.players.has(userId)) {
            await interaction.reply({ content: '❌ أنت لست مشارك في اللعبة!', flags: MessageFlags.Ephemeral });
            return;
        }

        game.players.delete(userId);

        const playersText = game.players.size > 0 ? 
            Array.from(game.players).map(id => `<@${id}>`).join('\n') : 
            'لا يوجد لاعبون بعد';

        const updatedEmbed = {
            color: 0xff6b35,
            title: '🎯 عجلة الحظ',
            description: `@here\n\n🎮 **لعبة عجلة الحظ الجديدة!**\n\n🎡 **المميزات:**\n• عجلة حقيقية تدور مع صورة متحركة\n• اختيار تلقائي عشوائي بعد التدوير\n• تأثيرات بصرية مذهلة\n• مؤثرات صوتية وانيميشن\n\n⏰ **وقت الانضمام: 30 ثانية**`,
            image: { url: 'https://media.giphy.com/media/3o7btPCcdNniyf0ArS/giphy.gif' },
            fields: [
                { name: `👥 اللاعبون (${game.players.size})`, value: playersText, inline: true },
                { name: '⏱️ الوقت المتبقي', value: '30 ثانية', inline: true },
                { name: '🎯 الحد الأدنى', value: '4 لاعبين', inline: true }
            ],
            footer: { text: '🎡 اضغط على "دخول اللعبة" للمشاركة في عجلة الحظ!' },
            timestamp: new Date()
        };

        await interaction.update({ embeds: [updatedEmbed] });

    } else if (interaction.customId.startsWith('wheel_eliminate_')) {
        if (game.phase !== 'playing') {
            await interaction.reply({ content: '❌ ليس وقت الاختيار الآن!', flags: MessageFlags.Ephemeral });
            return;
        }

        if (game.currentTurn !== userId) {
            await interaction.reply({ content: '❌ ليس دورك في الاختيار!', flags: MessageFlags.Ephemeral });
            return;
        }

        const targetPlayerId = interaction.customId.replace('wheel_eliminate_', '');

        if (!game.players.has(targetPlayerId)) {
            await interaction.reply({ content: '❌ هذا اللاعب ليس في اللعبة!', flags: MessageFlags.Ephemeral });
            return;
        }

        // طرد اللاعب
        game.players.delete(targetPlayerId);

        // إيقاف المؤقت
        if (game.spinTimeout) {
            clearTimeout(game.spinTimeout);
            game.spinTimeout = null;
        }

        const eliminateEmbed = {
            color: 0xff0000,
            title: '💥 تم طرد لاعب!',
            description: `<@${targetPlayerId}> تم طرده من اللعبة بواسطة <@${userId}>!\n\n🎯 **قرار العجلة نُفذ!**`,
            image: { url: 'https://media.giphy.com/media/l2JhpjWPccQhsAMfu/giphy.gif' },
            fields: [
                { name: '💀 اللاعب المطرود', value: `<@${targetPlayerId}>`, inline: true },
                { name: '🎯 بواسطة', value: `<@${userId}>`, inline: true },
                { name: '👥 اللاعبون المتبقون', value: `${game.players.size}`, inline: true }
            ],
            footer: { text: '🎡 الجولة التالية ستبدأ خلال 6 ثوان...' },
            timestamp: new Date()
        };

        await interaction.update({ 
            content: '',
            embeds: [eliminateEmbed], 
            components: [] 
        });

        // التحقق من الفائز أو الجولة التالية
        setTimeout(() => {
            if (!activeGames.has(channelId) || activeGames.get(channelId).type !== 'wheel-of-fortune') return;
            game.roundNumber++;
            startWheelRound(channelId, interaction);
        }, 6000);

    } else if (interaction.customId === 'wheel_quit') {
        if (game.phase !== 'playing') {
            await interaction.reply({ content: '❌ ليس وقت الاختيار الآن!', flags: MessageFlags.Ephemeral });
            return;
        }

        if (game.currentTurn !== userId) {
            await interaction.reply({ content: '❌ لا يمكنك استخدام زر الانسحاب إلا إذا كان دورك!', flags: MessageFlags.Ephemeral });
            return;
        }

        // انسحاب الشخص من اللعبة
        game.players.delete(userId);

        // إيقاف المؤقت
        if (game.spinTimeout) {
            clearTimeout(game.spinTimeout);
            game.spinTimeout = null;
        }

        const quitEmbed = {
            color: 0x808080,
            title: '🚪 انسحاب من اللعبة!',
            description: `<@${userId}> انسحب من اللعبة بإرادته!\n\n💔 **وداعاً أيها المحارب!**`,
            image: { url: 'https://media.giphy.com/media/l2JhOVmaJU9Tmp0mQ/giphy.gif' },
            fields: [
                { name: '🚪 اللاعب المنسحب', value: `<@${userId}>`, inline: true },
                { name: '👥 اللاعبون المتبقون', value: `${game.players.size}`, inline: true },
                { name: '🎯 السبب', value: 'انسحاب إرادي', inline: true }
            ],
            footer: { text: '🎡 الجولة التالية ستبدأ خلال 6 ثوان...' },
            timestamp: new Date()
        };

        await interaction.update({ 
            content: '',
            embeds: [quitEmbed], 
            components: [] 
        });

        // التحقق من الفائز أو الجولة التالية
        setTimeout(() => {
            if (!activeGames.has(channelId) || activeGames.get(channelId).type !== 'wheel-of-fortune') return;
            game.roundNumber++;
            startWheelRound(channelId, interaction);
        }, 6000);
    }
}

// دالة معالجة أزرار الروليت (للحفاظ على التوافق)
async function handleRouletteButton(interaction) {
    const channelId = interaction.channel.id;
    const userId = interaction.user.id;

    if (!activeGames.has(channelId) || activeGames.get(channelId).type !== 'roulette') {
        await interaction.reply({ content: '❌ لا توجد لعبة روليت نشطة في هذه القناة!', flags: MessageFlags.Ephemeral });
        return;
    }

    const game = activeGames.get(channelId);

    if (interaction.customId === 'roulette_join') {
        if (game.phase !== 'waiting') {
            await interaction.reply({ content: '❌ اللعبة بدأت بالفعل! لا يمكنك الانضمام الآن.', flags: MessageFlags.Ephemeral });
            return;
        }

        if (game.players.has(userId)) {
            await interaction.reply({ content: '❌ أنت مشارك في اللعبة بالفعل!', flags: MessageFlags.Ephemeral });
            return;
        }

        game.players.add(userId);

        const playersText = Array.from(game.players).map(id => `<@${id}>`).join('\n');

        const updatedEmbed = {
            color: 0xff4444,
            title: '🎯 لعبة الروليت',
            description: `@here\n\n🎮 **تم بدء لعبة روليت جديدة!**\n\n📋 **القواعد:**\n• الحد الأدنى: 4 لاعبين\n• كل جولة يختار لاعب عشوائي شخص لطرده\n• آخر لاعب متبقي هو الفائز\n\n⏰ **وقت الانضمام: 40 ثانية**`,
            fields: [
                { name: `👥 اللاعبون (${game.players.size})`, value: playersText, inline: true },
                { name: '⏱️ الوقت المتبقي', value: '40 ثانية', inline: true },
                { name: '🎯 الحالة', value: 'انتظار اللاعبين', inline: true }
            ],
            footer: { text: 'اضغط على "دخول اللعبة" للمشاركة!' },
            timestamp: new Date()
        };

        await interaction.update({ embeds: [updatedEmbed] });

        } else if (interaction.customId === 'roulette_leave') {
        if (game.phase !== 'waiting') {
            await interaction.reply({ content: '❌ اللعبة بدأت بالفعل! لا يمكنك الخروج الآن.', flags: MessageFlags.Ephemeral });
            return;
        }

        if (!game.players.has(userId)) {
            await interaction.reply({ content: '❌ أنت لست مشارك في اللعبة!', flags: MessageFlags.Ephemeral });
            return;
        }

        game.players.delete(userId);

        const playersText = game.players.size > 0 ? 
            Array.from(game.players).map(id => `<@${id}>`).join('\n') : 
            'لا يوجد لاعبون بعد';

        const updatedEmbed = {
            color: 0xff4444,
            title: '🎯 لعبة الروليت',
            description: `@here\n\n🎮 **تم بدء لعبة روليت جديدة!**\n\n📋 **القواعد:**\n• الحد الأدنى: 4 لاعبين\n• كل جولة يختار لاعب عشوائي شخص لطرده\n• آخر لاعب متبقي هو الفائز\n\n⏰ **وقت الانضمام: 40 ثانية**`,
            fields: [
                { name: `👥 اللاعبون (${game.players.size})`, value: playersText, inline: true },
                { name: '⏱️ الوقت المتبقي', value: '40 ثانية', inline: true },
                { name: '🎯 الحالة', value: 'انتظار اللاعبين', inline: true }
            ],
            footer: { text: 'اضغط على "دخول اللعبة" للمشاركة!' },
            timestamp: new Date()
        };

        await interaction.update({ embeds: [updatedEmbed] });

    } else if (interaction.customId.startsWith('roulette_vote_')) {
        if (game.phase !== 'playing') {
            await interaction.reply({ content: '❌ ليس وقت التصويت الآن!', flags: MessageFlags.Ephemeral });
            return;
        }

        if (game.currentTurn !== userId) {
            await interaction.reply({ content: '❌ ليس دورك في التصويت!', flags: MessageFlags.Ephemeral });
            return;
        }

        const targetPlayerId = interaction.customId.replace('roulette_vote_', '');

        if (!game.players.has(targetPlayerId)) {
            await interaction.reply({ content: '❌ هذا اللاعب ليس في اللعبة!', flags: MessageFlags.Ephemeral });
            return;
        }

        // طرد اللاعب
        game.players.delete(targetPlayerId);

        // إيقاف المؤقت
        if (game.votingTimeout) {
            clearTimeout(game.votingTimeout);
            game.votingTimeout = null;
        }

        await interaction.update({ 
            content: `💥 **تم طرد لاعب!**\n\n<@${targetPlayerId}> تم طرده من اللعبة بواسطة <@${userId}>!\n\n👥 **اللاعبون المتبقون:** ${game.players.size}\n🎯 **الجولة:** ${game.roundNumber}`, 
            embeds: [], 
            components: [] 
        });

        // التحقق من الفائز أو الجولة التالية
        setTimeout(() => {
            if (!activeGames.has(channelId) || activeGames.get(channelId).type !== 'roulette') return;
            game.roundNumber++;
            startRouletteRound(channelId, interaction);
        }, 6000);

    } else if (interaction.customId === 'roulette_random') {
        if (game.phase !== 'playing') {
            await interaction.reply({ content: '❌ ليس وقت التصويت الآن!', flags: MessageFlags.Ephemeral });
            return;
        }

        if (game.currentTurn !== userId) {
            await interaction.reply({ content: '❌ ليس دورك في التصويت!', flags: MessageFlags.Ephemeral });
            return;
        }

        // اختيار لاعب عشوائي (عدا الشخص نفسه)
        const playersArray = Array.from(game.players).filter(player => player !== userId);
        const randomTarget = getRandomElement(playersArray);

        // طرد اللاعب العشوائي
        game.players.delete(randomTarget);

        // إيقاف المؤقت
        if (game.votingTimeout) {
            clearTimeout(game.votingTimeout);
            game.votingTimeout = null;
        }

        await interaction.update({ 
            content: `🎲 **طرد عشوائي!**\n\n<@${randomTarget}> تم طرده من اللعبة بشكل عشوائي بواسطة <@${userId}>!\n\n👥 **اللاعبون المتبقون:** ${game.players.size}\n🎯 **الجولة:** ${game.roundNumber}`, 
            embeds: [], 
            components: [] 
        });

        // التحقق من الفائز أو الجولة التالية
        setTimeout(() => {
            if (!activeGames.has(channelId) || activeGames.get(channelId).type !== 'roulette') return;
            game.roundNumber++;
            startRouletteRound(channelId, interaction);
        }, 6000);

    } else if (interaction.customId === 'roulette_quit') {
        if (game.phase !== 'playing') {
            await interaction.reply({ content: '❌ ليس وقت التصويت الآن!', flags: MessageFlags.Ephemeral });
            return;
        }

        if (game.currentTurn !== userId) {
            await interaction.reply({ content: '❌ لا يمكنك استخدام زر الانسحاب إلا إذا كان دورك في الطرد!', flags: MessageFlags.Ephemeral });
            return;
        }

        // انسحاب الشخص من اللعبة
        game.players.delete(userId);

        // إيقاف المؤقت
        if (game.votingTimeout) {
            clearTimeout(game.votingTimeout);
            game.votingTimeout = null;
        }

        await interaction.update({ 
            content: `🚪 **انسحاب من الفعالية!**\n\n<@${userId}> انسحب من اللعبة بإرادته!\n\n👥 **اللاعبون المتبقون:** ${game.players.size}\n🎯 **الجولة:** ${game.roundNumber}`, 
            embeds: [], 
            components: [] 
        });

        // التحقق من الفائز أو الجولة التالية
        setTimeout(() => {
            if (!activeGames.has(channelId) || activeGames.get(channelId).type !== 'roulette') return;
            game.roundNumber++;
            startRouletteRound(channelId, interaction);
        }, 6000);
    }
}

// دالة معالجة أزرار النرد
async function handleDiceButton(interaction) {
    const channelId = interaction.channel.id;
    const userId = interaction.user.id;

    if (!activeGames.has(channelId) || activeGames.get(channelId).type !== 'dice') {
        await interaction.reply({ content: '❌ لا توجد لعبة نرد نشطة في هذه القناة!', flags: MessageFlags.Ephemeral });
        return;
    }

    const game = activeGames.get(channelId);

    if (interaction.customId === 'dice_join') {
        if (game.phase !== 'waiting') {
            await interaction.reply({ content: '❌ اللعبة بدأت بالفعل! لا يمكنك الانضمام الآن.', flags: MessageFlags.Ephemeral });
            return;
        }

        if (game.players.has(userId)) {
            await interaction.reply({ content: '❌ أنت مشارك في اللعبة بالفعل!', flags: MessageFlags.Ephemeral });
            return;
        }

        game.players.add(userId);

        const playersText = Array.from(game.players).map(id => `<@${id}>`).join('\n');

        const updatedEmbed = {
            color: 0x00ff00,
            title: '🎲 لعبة النرد الجماعية',
            description: `@here\n\n🎮 **تم بدء لعبة نرد جماعية!**\n\n📋 **القواعد:**\n• الحد الأدنى: 4 لاعبين\n• يتم تقسيم اللاعبين لفريقين\n• 3 جولات للمنافسة\n• كل لاعب يحصل على نرد عشوائي\n\n⏰ **وقت الانضمام: 30 ثانية**`,
            fields: [
                { name: `👥 اللاعبون (${game.players.size})`, value: playersText, inline: true },
                { name: '⏱️ الوقت المتبقي', value: '30 ثانية', inline: true },
                { name: '🎯 الحالة', value: 'انتظار اللاعبين', inline: true }
            ],
            footer: { text: 'اضغط على "دخول اللعبة" للمشاركة!' },
            timestamp: new Date()
        };

        await interaction.update({ embeds: [updatedEmbed] });

    } else if (interaction.customId === 'dice_leave') {
        if (game.phase !== 'waiting') {
            await interaction.reply({ content: '❌ اللعبة بدأت بالفعل! لا يمكنك الخروج الآن.', flags: MessageFlags.Ephemeral });
            return;
        }

        if (!game.players.has(userId)) {
            await interaction.reply({ content: '❌ أنت لست مشارك في اللعبة!', flags: MessageFlags.Ephemeral });
            return;
        }

        game.players.delete(userId);

        const playersText = game.players.size > 0 ? 
            Array.from(game.players).map(id => `<@${id}>`).join('\n') : 
            'لا يوجد لاعبون بعد';

        const updatedEmbed = {
            color: 0x00ff00,
            title: '🎲 لعبة النرد الجماعية',
            description: `@here\n\n🎮 **تم بدء لعبة نرد جماعية!**\n\n📋 **القواعد:**\n• الحد الأدنى: 4 لاعبين\n• يتم تقسيم اللاعبين لفريقين\n• 3 جولات للمنافسة\n• كل لاعب يحصل على نرد عشوائي\n\n⏰ **وقت الانضمام: 30 ثانية**`,
            fields: [
                { name: `👥 اللاعبون (${game.players.size})`, value: playersText, inline: true },
                { name: '⏱️ الوقت المتبقي', value: '30 ثانية', inline: true },
                { name: '🎯 الحالة', value: 'انتظار اللاعبين', inline: true }
            ],
            footer: { text: 'اضغط على "دخول اللعبة" للمشاركة!' },
            timestamp: new Date()
        };

        await interaction.update({ embeds: [updatedEmbed] });

    } else if (interaction.customId === 'dice_skip' || interaction.customId === 'dice_retry') {
        if (game.phase !== 'playing') {
            await interaction.reply({ content: '❌ ليس وقت اللعب الآن!', flags: MessageFlags.Ephemeral });
            return;
        }

        if (game.currentPlayer !== userId) {
            await interaction.reply({ content: '❌ ليس دورك الآن!', flags: MessageFlags.Ephemeral });
            return;
        }

        const diceResult = game.currentDice;
        let points = 0;
        let resultMessage = '';

        if (interaction.customId === 'dice_skip') {
            resultMessage = `⏭️ **تم التخطي!**\n<@${userId}> اختار التخطي ولم يحصل على نقاط.`;
        } else if (interaction.customId === 'dice_retry') {
            if (diceResult.type === 'normal') {
                points = diceResult.points;
                resultMessage = `🎲 **حصل على ${points} نقاط!**`;
            } else if (diceResult.type === 'bonus') {
                const currentPoints = game.scores[userId] || 0;
                points = diceResult.points;
                game.scores[userId] = currentPoints + points;
                resultMessage = `🎉 **مكافأة! +${points} نقاط إضافية!**\nالنقاط الحالية: ${game.scores[userId]}`;
            } else if (diceResult.type === 'penalty') {
                const currentPoints = game.scores[userId] || 0;
                const penalty = Math.abs(diceResult.points);
                const newPoints = Math.max(0, currentPoints - penalty);
                game.scores[userId] = newPoints;
                resultMessage = `⚠️ **عقوبة! -${penalty} نقاط!**\nالنقاط الحالية: ${game.scores[userId]}`;
            } else if (diceResult.type === 'block') {
                resultMessage = `🚫 **محظور! لا تحصل على نقاط هذا الدور.**`;
            } else if (diceResult.type === 'safe') {
                resultMessage = `✅ **آمن! محمي من العقوبات.**`;
            }

            // إضافة النقاط العادية
            if (diceResult.type === 'normal') {
                game.scores[userId] = (game.scores[userId] || 0) + points;
            }
        }

        const diceDisplay = `
🎲 **نتيجة النرد:**

\`\`\`
┌─────┐    ┌─────┐
│  ${diceResult.points > 0 ? diceResult.points : 0}  │    │  ${diceResult.points > 0 ? diceResult.points : 0}  │
└─────┘    └─────┘
\`\`\`

**النقاط:** ${diceResult.points}
`
        await interaction.update({
            content: `${resultMessage}\n\n🎯 **المشارك:** <@${userId}>\n${diceDisplay}`,
            components: []
        });

        // الانتقال للاعب التالي
        game.currentPlayerIndex++;
        setTimeout(() => {
            if (!activeGames.has(channelId) || activeGames.get(channelId).type !== 'dice') return;
            nextPlayerTurn(channelId, interaction);
        }, 3000);
    }
}

// تصدير الوحدة
module.exports = {
    gamesCommands,
    handleGamesCommand,
    handleGameMessage,
    handleRouletteButton,
    handleWheelButton,
    handleDiceButton,
    startDiceGame,
    startWheelRound,
    activeGames,
    playerStats
};

async function sendDiceMessage(channel, game) {
    const dice1 = Math.floor(Math.random() * 6) + 1;
    const dice2 = Math.floor(Math.random() * 6) + 1;
    const total = dice1 + dice2;

    game.currentDice = { dice1, dice2, total };

    // إنشاء صورة نرد كبيرة وواضحة
    const diceDisplay = `
🎲 **نتيجة النرد:**

\`\`\`
┌─────┐    ┌─────┐
│  ${dice1}  │    │  ${dice2}  │
└─────┘    └─────┘
\`\`\`

**النرد الأول:** ${dice1}
**النرد الثاني:** ${dice2}
**المجموع:** ${total}

اختر توقعك:
🟢 أعلى من 7 (8-12)
🔴 أقل من 7 (2-6) 
🔵 بالضبط 7
⏭️ تخطي الدور`;

    const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId(`dice_higher_${game.id}`)
                .setLabel('أعلى من 7 🟢')
                .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId(`dice_lower_${game.id}`)
                .setLabel('أقل من 7 🔴')
                .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
                .setCustomId(`dice_exact_${game.id}`)
                .setLabel('بالضبط 7 🔵')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId(`dice_skip_${game.id}`)
                .setLabel('تخطي ⏭️')
                .setStyle(ButtonStyle.Secondary)
        );

    const message = await channel.send({ 
        content: `🎯 **دور ${game.players[game.currentPlayer]}**\n\n${diceDisplay}`,
        components: [row]
    });

    game.currentMessage = message;

    // تخطي تلقائي بعد 5 ثواني
    game.skipTimeout = setTimeout(async () => {
        if (game.currentMessage && game.currentPlayer !== undefined) {
            try {
                // تخطي الدور الحالي
                const skippedPlayer = game.players[game.currentPlayer];
                game.currentPlayer = (game.currentPlayer + 1) % game.players.length;

                // تحديث الرسالة لإظهار التخطي
                await message.edit({ 
                    content: `~~🎯 **دور ${skippedPlayer}**~~\n\n${diceDisplay}\n\n⏰ **تم التخطي تلقائياً بعد 5 ثواني!**`,
                    components: []
                });

                // إرسال دور الشخص التالي
                if (game.rounds < game.maxRounds) {
                     sendDiceMessage(channel, game);
                } else {
                    endDiceGame(channel, game);
                }
            } catch (error) {
                console.error('خطأ في التخطي التلقائي:', error);
            }
        }
    }, 5000);
}

function endDiceGame(channel, game) {
    // تنظيف التايمر إذا كان موجود
    if (game.skipTimeout) {
        clearTimeout(game.skipTimeout);
        game.skipTimeout = null;
    }

    // ترتيب اللاعبين حسب النقاط
    const sortedPlayers = game.players
        .map(playerId => ({
            id: playerId,
            score: game.scores[playerId] || 0
        }))
        .sort((a, b) => b.score - a.score);

    let resultMessage = '🏆 **نتائج لعبة النرد:**\n\n';

    sortedPlayers.forEach((player, index) => {
        const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '🏅';
        resultMessage += `${medal} <@${player.id}>: **${player.score}** نقطة\n`;
    });

    channel.send(resultMessage);

    // إزالة اللعبة من القائمة النشطة
    activeGames.delete(game.id);
}