const _ = require('underscore');

const AbilityLimit = require('./abilitylimit.js');
const CannotRestriction = require('./cannotrestriction.js');
const EffectBuilder = require('./Effects/EffectBuilder');

/* Types of effect
    1. Static effects - do something for a period
    2. Dynamic effects - like static, but what they do depends on the game state
    3. Detached effects - do something when applied, and on expiration, but can be ignored in the interim
*/

const Effects = {
    // Card effects
    addFaction: (faction) => EffectBuilder.card.static('addFaction', faction),
    addGloryWhileDishonored: () => EffectBuilder.card.static('addGloryWhileDishonored'),
    addKeyword: (keyword) => EffectBuilder.card.static('addKeyword', keyword),
    addTrait: (trait) => EffectBuilder.card.static('addTrait', trait),
    blank: () => EffectBuilder.card.static('blank'),
    canBeSeenWhenFacedown: () => EffectBuilder.card.static('canBeSeenWhenFacedown'),
    cannotParticipateAsAttacker: (type = 'both') => EffectBuilder.card.static('cannotParticipateAsAttacker', type),
    cannotParticipateAsDefender: (type = 'both') => EffectBuilder.card.static('cannotParticipateAsDefender', type),
    cardCannot: (properties) => EffectBuilder.card.static('abilityRestrictions', new CannotRestriction(properties)),
    customDetachedCard: (properties) => EffectBuilder.card.detached('customEffect', properties),
    delayedEffect: (properties) => EffectBuilder.card.detached('delayedEffect', {
        apply: (card, context) => {
            properties.target = card;
            properties.context = properties.context || context;
            return context.source.delayedEffect(() => properties);
        },
        unapply: (card, context, effect) => context.game.effectEngine.removeDelayedEffect(effect)
    }),
    doesNotBow: () => EffectBuilder.card.static('doesNotBow'),
    doesNotReady: () => EffectBuilder.card.static('doesNotReady'),
    gainAbility: (abilityType, properties) => EffectBuilder.card.detached('gainAbility', {
        apply: (card, context) => {
            let ability;
            if(abilityType === 'action') {
                ability = card.action(properties);
            } else {
                ability = card.triggeredAbility(abilityType, properties);
                ability.registerEvents();
            }
            if(context.source.grantedAbilityLimits) {
                if(context.source.grantedAbilityLimits[card.uuid]) {
                    ability.limit = context.source.grantedAbilityLimits[card.uuid];
                } else {
                    context.source.grantedAbilityLimits[card.uuid] = ability.limit;
                }
            }
            return ability;
        },
        unapply: (card, context, ability) => {
            if(abilityType === 'action') {
                card.abilities.actions = card.abilities.actions.filter(a => a !== ability);
            } else {
                card.abilities.reactions = card.abilities.reactions.filter(a => a !== ability);
                ability.unregisterEvents();
            }
        }
    }),
    gainPlayAction: (playActionClass) => EffectBuilder.card.detached('gainPlayAction', {
        apply: card => {
            let action = new playActionClass(card);
            card.abilities.playActions.push(action);
            return action;
        },
        unapply: (card, context, playAction) => card.abilities.playActions = card.abilities.playActions.filter(action => action !== playAction)
    }),
    immunity: (properties) => EffectBuilder.card.static('abilityRestrictions', new CannotRestriction(properties)),
    increaseLimitOnAbilities: (amount) => EffectBuilder.card.static('increaseLimitOnAbilities', amount),
    modifyBaseMilitarySkill: (value) => EffectBuilder.card.flexible('modifyBaseMilitarySkill', value),
    modifyBasePoliticalSkill: (value) => EffectBuilder.card.flexible('modifyBasePoliticalSkill', value),
    modifyBaseProvinceStrength: (value) => EffectBuilder.card.flexible('modifyBaseProvinceStrength', value),
    modifyBothSkills: (value) => EffectBuilder.card.flexible('modifyBothSkills', value),
    modifyDuelGlory: (value) => EffectBuilder.card.static('modifyDuelGlory', value),
    modifyDuelMilitarySkill: (value) => EffectBuilder.card.static('modifyDuelMilitarySkill', value),
    modifyDuelPoliticalSkill: (value) => EffectBuilder.card.static('modifyDuelPoliticalSkill', value),
    modifyGlory: (value) => EffectBuilder.card.flexible('modifyGlory', value),
    modifyMilitarySkill: (value) => EffectBuilder.card.flexible('modifyMilitarySkill', value),
    modifyMilitarySkillMultiplier: (value) => EffectBuilder.card.flexible('modifyMilitarySkillMultiplier', value),
    modifyPoliticalSkill: (value) => EffectBuilder.card.flexible('modifyPoliticalSkill', value),
    modifyPoliticalSkillMultiplier: (value) => EffectBuilder.card.flexible('modifyPoliticalSkillMultiplier', value),
    modifyProvinceStrength: (value) => EffectBuilder.card.flexible('modifyProvinceStrength', value),
    modifyProvinceStrengthMultiplier: (value) => EffectBuilder.card.flexible('modifyProvinceStrengthMultiplier', value),
    setBaseMilitarySkill: (value) => EffectBuilder.card.static('setBaseMilitarySkill', value),
    setBasePoliticalSkill: (value) => EffectBuilder.card.static('setBasePoliticalSkill', value),
    setBaseProvinceStrength: (value) => EffectBuilder.card.static('setBaseProvinceStrength', value),
    setDash: (type) => EffectBuilder.card.static('setDash', type),
    setMilitarySkill: (value) => EffectBuilder.card.static('setMilitarySkill', value),
    setPoliticalSkill: (value) => EffectBuilder.card.static('setPoliticalSkill', value),
    setProvinceStrength: (value) => EffectBuilder.card.static('setProvinceStrength', value),
    takeControl: (player) => EffectBuilder.card.static('takeControl', player),
    terminalCondition: (properties) => EffectBuilder.card.detached('terminalCondition', {
        apply: (card, context) => {
            properties.target = card;
            properties.context = properties.context || context;
            return context.source.terminalCondition(() => properties);
        },
        unapply: (card, context, effect) => context.game.effectEngine.removeTerminalCondition(effect)
    }),
    // Ring effects
    addElement: (element) => EffectBuilder.ring.static('addElement', element),
    cannotDeclareRing: (match) => EffectBuilder.ring.static('cannotDeclare', match), // TODO: Add this to lasting effect checks
    considerRingAsClaimed: (match) => EffectBuilder.ring.static('considerAsClaimed', match), // TODO: Add this to lasting effect checks
    // Player effects
    additionalCharactersInConflict: (amount) => EffectBuilder.player.flexible('additionalCharactersInConflict', amount),
    additionalConflict: (type) => EffectBuilder.player.detached('additionalConflict', {
        apply: player => player.addConflictOpportunity(type),
        unapply: () => true
    }),
    alternateFatePool: (match) => EffectBuilder.player.static('alternateFatePool', match),
    canPlayFromOwn: (location) => EffectBuilder.player.detached('canPlayFromOwn', {
        apply: (player) => player.addPlayableLocation('play', player, location),
        unapply: (player, context, location) => player.removePlayableLocation(location)
    }),
    changePlayerGloryModifier: (value) => EffectBuilder.player.static('gloryModifier', value),
    changePlayerSkillModifier: (value) => EffectBuilder.player.flexible('conflictSkillModifier', value),
    customDetachedPlayer: (properties) => EffectBuilder.player.detached('customEffect', properties),
    gainActionPhasePriority: () => EffectBuilder.player.detached('actionPhasePriority', {
        apply: player => player.actionPhasePriority = true,
        unapply: player => player.actionPhasePriority = false
    }),
    increaseCost: (properties) => Effects.reduceCost(_.extend(properties, { amount: -properties.amount })),
    playerCannot: (properties) => EffectBuilder.player.static('abilityRestrictions', new CannotRestriction(properties)),
    reduceCost: (properties) => EffectBuilder.player.detached('costReducer', {
        apply: (player, context) => player.addCostReducer(context.source, properties),
        unapply: (player, context, reducer) => player.removeCostReducer(reducer)
    }),
    reduceNextPlayedCardCost: (amount, match) => EffectBuilder.player.detached('costReducer', {
        apply: (player, context) => player.addCostReducer(context.source, { amount: amount, match: match, limit: AbilityLimit.fixed(1) }),
        unapply: (player, context, reducer) => player.removeCostReducer(reducer)
    }),
    setMaxConflicts: (amount) => EffectBuilder.player.static('maxConflicts', amount),
    showTopConflictCard: () => EffectBuilder.player.static('showTopConflictCard'),
    // Conflict effects
    contributeToConflict: (card) => EffectBuilder.conflict.static('contribute', card),
    changeConflictSkillFunction: (func) => EffectBuilder.conflict.static('skillFunction', func), // TODO: Add this to lasting effect checks
    modifyConflictElementsToResolve: (value) => EffectBuilder.conflict.static('modifyConflictElementsToResolve', value), // TODO: Add this to lasting effect checks
    restrictNumberOfDefenders: (value) => EffectBuilder.conflict.static('restrictNumberOfDefenders', value) // TODO: Add this to lasting effect checks
};

module.exports = Effects;
