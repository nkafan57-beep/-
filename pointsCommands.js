
const { pointsCommands, handlePointsCommand } = require('../points-system');

module.exports = {
    commands: pointsCommands,
    handleCommand: handlePointsCommand
};
