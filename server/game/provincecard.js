const _ = require('underscore');

const BaseCard = require('./basecard.js');

class ProvinceCard extends BaseCard {
    constructor(owner, cardData) {
        super(owner, cardData);

        this.isProvince = true;
        this.isBroken = false;
        this.menu = _([{ command: 'break', text: 'Break/unbreak this province' }, { command: 'hide', text: 'Flip face down' }]);
    }

    get strength() {
        return this.getStrength();
    }

    getStrength() {
        if(this.anyEffect('setProvinceStrength')) {
            return this.mostRecentEffect('setProvinceStrength');
        }

        let strength = this.baseStrength + this.sumEffects('modifyProvinceStrength') + this.getDynastyOrStrongholdCardModifier();
        return this.getEffects('modifyProvinceStrengthMultiplier').reduce((total, value) => total * value, strength);
    }

    get baseStrength() {
        return this.getBaseStrength();
    }

    getBaseStrength() {
        if(this.anyEffect('setBaseProvinceStrength')) {
            return this.mostRecentEffect('setBaseProvinceStrength');
        }
        return this.sumEffects('modifyBaseProvinceStrength') + (parseInt(this.cardData.strength) ? parseInt(this.cardData.strength) : 0);
    }

    getDynastyOrStrongholdCardModifier() {
        let province = this.controller.getSourceList(this.location);
        return province.reduce((bonus, card) => bonus + card.getProvinceStrengthBonus(), 0);
    }

    get element() {
        return this.getElement();
    }

    getElement() {
        return this.cardData.element;
    }

    flipFaceup() {
        this.facedown = false;
    }

    isConflictProvince() {
        return this.game.currentConflict && this.game.currentConflict.conflictProvince === this;
    }

    isBlank() {
        return this.isBroken || super.isBlank();
    }

    breakProvince() {
        this.isBroken = true;
        if(this.controller.opponent) {
            this.game.addMessage('{0} has broken {1}!', this.controller.opponent, this);
            if(this.location === 'stronghold province') {
                this.game.recordWinner(this.controller.opponent, 'conquest');
            } else {
                let dynastyCard = this.controller.getDynastyCardInProvince(this.location);
                if(dynastyCard) {
                    let promptTitle = 'Do you wish to discard ' + (dynastyCard.facedown ? 'the facedown card' : dynastyCard.name) + '?';
                    this.game.promptWithHandlerMenu(this.controller.opponent, {
                        activePromptTitle: promptTitle,
                        source: 'Break ' + this.name,
                        choices: ['Yes', 'No'],
                        handlers: [
                            () => {
                                this.game.addMessage('{0} chooses to discard {1}', this.controller.opponent, dynastyCard.facedown ? 'the facedown card' : dynastyCard);
                                this.controller.moveCard(dynastyCard, 'dynasty discard pile');
                            },
                            () => this.game.addMessage('{0} chooses not to discard {1}', this.controller.opponent, dynastyCard.facedown ? 'the facedown card' : dynastyCard)
                        ]
                    });
                }
            }
        }
    }

    cannotBeStrongholdProvince() {
        return false;
    }

    hideWhenFacedown() {
        return false;
    }

    getSummary(activePlayer, hideWhenFaceup) {
        let baseSummary = super.getSummary(activePlayer, hideWhenFaceup);

        return _.extend(baseSummary, {
            isProvince: this.isProvince,
            isBroken: this.isBroken
        });
    }

}

module.exports = ProvinceCard;
