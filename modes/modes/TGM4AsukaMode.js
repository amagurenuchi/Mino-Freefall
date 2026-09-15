class TGM4AsukaMode extends BaseMode {
    constructor(variant = 'normal') {
        super();
        this.variant = variant;
        this.modeName = variant === 'easy' ? 'Asuka Easy' : variant === 'hard' ? 'Asuka Hard' : 'Asuka';
        this.modeId = `tgm4_asuka_${variant}`;
        this.config = this.getModeConfig();
        this.currentTiming = this.getTimingForLevel(0);
        this.kitas = 0;
        this.totalKitas = 0;
        this.sectionKitas = 0;
        this.easySectionBonus = 0;
        this.backsteps = 0;
        this.sectionsPassed = 0;
        this.maxLevelReached = 0;
        this.completed = false;
        this.sectionStopBravoHold = false;
        this.currentRotationSystem = 'SRS';
        this.gameSceneRef = null;
        this.timeRemaining = 0;
        this.timerStarted = false;
        this.timeExpired = false;
        this.lastTimerTime = null;
        this.hardKitaRequirements = [
            { required: 2, timeLimit: 31.0, reduction: 1 },
            { required: 2, timeLimit: 25.0, reduction: 1 },
            { required: 3, timeLimit: 22.0, reduction: 1 },
            { required: 3, timeLimit: 21.0, reduction: 1 },
            { required: 5, timeLimit: 20.0, reduction: 1 },
            { required: 6, timeLimit: 17.8, reduction: 1 },
            { required: 7, timeLimit: 17.6, reduction: 1 },
            { required: 8, timeLimit: 17.4, reduction: 1 },
            { required: 9, timeLimit: 17.2, reduction: 1 },
            { required: 9, timeLimit: 17.1, reduction: 1 },
            { required: 10, timeLimit: 17.0, reduction: 1 },
            { required: 11, timeLimit: 17.0, reduction: 2 },
            { required: 13, timeLimit: 16.5, reduction: 2 }
        ];
        this.asukaTransitionStatus = null;
    }

    getModeConfig() {
        const easy = this.variant === 'easy';
        const hard = this.variant === 'hard';
        return {
            gravity: easy ? { type: 'custom', curve: level => this.getAsukaEasyGravity(level) } : { type: 'static', value: 5120 },
            das: 12/60,
            arr: 1/60,
            are: easy ? 18/60 : 20/60,
            lineAre: easy ? 27/60 : 16/60,
            lockDelay: 30/60,
            lineClearDelay: easy ? 40/60 : 12/60,
            nextPieces: 6,
            holdEnabled: true,
            ghostEnabled: true,
            levelUpType: 'piece',
            lineClearBonus: 1,
            gravityLevelCap: easy ? 1000 : 1300,
            lowestGrade: easy ? 'Ae 1' : hard ? 'Am Grade 0' : '',
            hasGrading: true,
            specialMechanics: {
                kitaRequired: true,
                rewind: true,
                infinity: true,
                vanishAfter1000: !easy,
                invisibleAfter1200: !easy,
                carriedKitas: hard,
                timeLimit: easy ? 1800 : hard ? 270 : 420
            }
        };
    }

    getBgmConfig() {
        return {
            progressSource: 'level',
            stopSource: 'level',
            useStopBuffer: false,
            transitionStopOffset: 9,
            segments: [
                { end: 999, key: 'mf2_4' },
                { end: 1300, key: 'mf3_4' }
            ],
            credits: {
                key: 'mf2_endroll',
                reuseCurrentTrack: false
            }
        };
    }

    initializeForGameScene(gameScene) {
        this.gameSceneRef = gameScene || null;
        this.currentRotationSystem = gameScene?.rotationSystem || 'SRS';
        this.currentTiming = this.getTimingForLevel(gameScene?.level || 0);
        this.timeRemaining = this.config.specialMechanics.timeLimit;
        this.timerStarted = false;
        this.timeExpired = false;
        this.lastTimerTime = null;
        if (gameScene) {
            gameScene.kitas = this.kitas;
        }
    }

    isTgmRule() {
        return this.currentRotationSystem === 'ARS' ||
            this.currentRotationSystem === 'TGM' ||
            this.currentRotationSystem === 'classic';
    }

    getAsukaEasyGravity(level) {
        // TGM1 gravity curve offset by +300 levels, capped at 5376 (21G)
        const g = this.getTGM1GravitySpeed(Math.max(0, level - 300));
        return g >= 5120 ? 5376 : g;
    }

    getTimingForLevel(level) {
        const frame = n => n / 60;
        if (this.variant === 'easy') {
            return { are: frame(32), lineAre: frame(32), das: frame(18), lock: frame(30), lineClear: frame(40) };
        }
        if (!this.isTgmRule()) {
            if (level < 100) return { are: frame(18), lineAre: frame(14), das: frame(14), lock: frame(30), lineClear: frame(12) };
            if (level < 200) return { are: frame(14), lineAre: frame(8), das: frame(14), lock: frame(26), lineClear: frame(6) };
            if (level === 200) return { are: frame(12), lineAre: frame(8), das: frame(14), lock: frame(18), lineClear: frame(6) };
            if (level < 300) return { are: frame(12), lineAre: frame(8), das: frame(12), lock: frame(18), lineClear: frame(6) };
            if (level === 300) return { are: frame(12), lineAre: frame(7), das: frame(12), lock: frame(18), lineClear: frame(5) };
            if (level < 400) return { are: frame(12), lineAre: frame(7), das: frame(10), lock: frame(18), lineClear: frame(5) };
            if (level < 500) return { are: frame(12), lineAre: frame(6), das: frame(10), lock: frame(17), lineClear: frame(4) };
            if (level < 700) return { are: frame(8), lineAre: frame(6), das: frame(10), lock: frame(15), lineClear: frame(4) };
            if (level === 700) return { are: frame(6), lineAre: frame(5), das: frame(10), lock: frame(13), lineClear: frame(3) };
            if (level < 800) return { are: frame(6), lineAre: frame(5), das: frame(8), lock: frame(13), lineClear: frame(3) };
            return { are: frame(6), lineAre: frame(5), das: frame(8), lock: frame(12), lineClear: frame(3) };
        }
        if (level < 100) return { are: frame(20), lineAre: frame(16), das: frame(12), lock: frame(30), lineClear: frame(12) };
        if (level < 200) return { are: frame(16), lineAre: frame(10), das: frame(12), lock: frame(26), lineClear: frame(6) };
        if (level < 300) return { are: frame(16), lineAre: frame(10), das: frame(11), lock: frame(22), lineClear: frame(6) };
        if (level < 400) return { are: frame(10), lineAre: frame(10), das: frame(10), lock: frame(18), lineClear: frame(6) };
        if (level < 500) return { are: frame(9),  lineAre: frame(9),  das: frame(8),  lock: frame(15), lineClear: frame(5) };
        return { are: frame(8), lineAre: frame(8), das: frame(8), lock: frame(15), lineClear: frame(4) };
    }

    onLineClear(gameScene, linesCleared) {
        let gainedKitas = 0;
        const isTetris = linesCleared >= 4;
        const isStandardRule = !this.isTgmRule();
        const isTSpinTriple = isStandardRule && linesCleared === 3 && gameScene?.lastSpinInfo?.isTSpin;
        const isBravo = gameScene?.bravoActive || gameScene?.lastClearType === 'bravo' || (gameScene?.lastClearType && gameScene.lastClearType.includes('all clear'));
        const atSectionStop = typeof gameScene?.level === 'number' && gameScene.level % 100 === 99;
        if (isBravo && atSectionStop && this.kitas <= 0) {
            this.sectionStopBravoHold = true;
        }

        if (isTetris || isTSpinTriple) {
            gainedKitas += 1;
            gameScene.playSfx("kitaspawn");
        }
        if (isBravo) {
            gainedKitas += (this.variant === 'hard' ? 1 : 2);
            gameScene.playSfx("kitaspawn");
        }

        this.kitas += gainedKitas;
        this.totalKitas += gainedKitas;
        this.sectionKitas += gainedKitas;
        if (gameScene) gameScene.kitas = this.kitas;
    }

    getHardSectionRequirement(sectionIndex) {
        return this.hardKitaRequirements[sectionIndex] || this.hardKitaRequirements[this.hardKitaRequirements.length - 1];
    }

    getHardSectionCost(sectionIndex) {
        const rule = this.getHardSectionRequirement(sectionIndex);
        const sectionTime = this.gameSceneRef
            ? Math.max(0, (this.gameSceneRef.currentTime || 0) - (this.gameSceneRef.sectionStartTime || 0))
            : Number.POSITIVE_INFINITY;
        const reduction = sectionTime <= rule.timeLimit ? rule.reduction : 0;
        return Math.max(0, rule.required - reduction);
    }

    handleLineClear(gameScene, linesCleared) {
        // Asuka processes Kita gain during line-based level updates so section-stop
        // checks can use the newly earned Kita from the same clear.
    }

    onLevelUpdate(level, oldLevel, updateType = 'piece', amount = 1) {
        const max = this.config.gravityLevelCap;
        if (updateType !== 'lines') {
            const nextLevel = Math.min(level + 1, max);
            this.maxLevelReached = Math.max(this.maxLevelReached, nextLevel);
            this.completed = this.maxLevelReached >= max;
            this.currentTiming = this.getTimingForLevel(nextLevel);
            if (this.gameSceneRef) {
                this.gameSceneRef.kitas = this.kitas;
            }
            return nextLevel;
        }

        const lineClearAmount = Math.max(amount || 0, 0);
        if (lineClearAmount > 0) {
            this.onLineClear(this.gameSceneRef, lineClearAmount);
        }

        let nextLevel = level + lineClearAmount;
        const nextSection = Math.floor(nextLevel / 100);
        const currentSection = Math.floor(level / 100);

        if (nextSection > currentSection) {
            if (this.sectionStopBravoHold) {
                this.sectionStopBravoHold = false;
                this.currentTiming = this.getTimingForLevel(currentSection * 100 + 99);
                return currentSection * 100 + 99;
            }
            const requiredKitas = this.variant === 'hard'
                ? this.getHardSectionCost(currentSection)
                : 1;
            if (this.kitas < requiredKitas) {
                nextLevel = currentSection * 100 + 99;
                this.asukaTransitionStatus = 'failed';
                this.gameSceneRef.playSfx("kitatrip");
            } else {
                this.asukaTransitionStatus = 'achieved';
                this.sectionsPassed = Math.max(this.sectionsPassed, nextSection);
                if (this.variant === 'hard') {
                    this.kitas = Math.max(0, this.kitas - requiredKitas);
                } else {
                    this.kitas = 0;
                }
            }
        }

        this.maxLevelReached = Math.max(this.maxLevelReached, Math.min(nextLevel, max));
        this.completed = this.maxLevelReached >= max;
        this.currentTiming = this.getTimingForLevel(nextLevel);
        if (this.gameSceneRef) {
            this.gameSceneRef.kitas = this.kitas;
        }
        return Math.min(nextLevel, max);
    }

    onSectionComplete(gameScene, sectionIndex) {
        this.sectionsPassed = Math.max(this.sectionsPassed, sectionIndex + 1);
        if (this.variant === 'easy') {
            this.easySectionBonus += 3 * Math.floor(this.sectionKitas / 3);
        }
        this.sectionKitas = 0;
    }

    onGameOver(gameScene) {
        if (gameScene) {
            this.maxLevelReached = Math.max(this.maxLevelReached, gameScene.level || 0);
            this.completed = this.completed || this.maxLevelReached >= this.config.gravityLevelCap;
        }
    }

    getAsukaEasyGradeValue() {
        let grade = Math.floor(this.maxLevelReached / 70) * 6;
        if (this.maxLevelReached >= 1000) grade += 7;
        grade += this.easySectionBonus;
        grade += Math.ceil((this.totalKitas - this.backsteps) / 2.5);
        return grade;
    }

    getDisplayedGrade() {
        if (this.variant === 'normal') return this.completed ? 'Am' : '';
        if (this.variant === 'hard') return this.completed ? 'AGm' : `Am Grade ${this.sectionsPassed}`;
        const grade = this.getAsukaEasyGradeValue();
        return grade > 0 ? `Ae ${grade}` : '';
    }

    getGradePoints() {
        if (this.variant === 'easy') return this.getAsukaEasyGradeValue();
        return this.kitas;
    }

    getARE() { return this.currentTiming?.are ?? this.config.are; }
    getLineARE() { return this.currentTiming?.lineAre ?? this.config.lineAre; }
    getDAS() { return this.currentTiming?.das ?? this.config.das; }
    getLockDelay() { return this.currentTiming?.lock ?? this.config.lockDelay; }
    getLineClearDelay() { return this.currentTiming?.lineClear ?? this.config.lineClearDelay; }
    getDisplayedTime() { return this.timeRemaining; }

    captureBackstepState() {
        return {
            kitas: this.kitas,
            totalKitas: this.totalKitas,
            sectionKitas: this.sectionKitas,
            easySectionBonus: this.easySectionBonus,
            sectionsPassed: this.sectionsPassed,
            maxLevelReached: this.maxLevelReached,
            completed: this.completed,
            sectionStopBravoHold: this.sectionStopBravoHold,
            asukaTransitionStatus: this.asukaTransitionStatus,
        };
    }

    restoreBackstepState(gameScene, state = {}) {
        this.kitas = state.kitas || 0;
        this.totalKitas = state.totalKitas || 0;
        this.sectionKitas = state.sectionKitas || 0;
        this.easySectionBonus = state.easySectionBonus || 0;
        this.sectionsPassed = state.sectionsPassed || 0;
        this.maxLevelReached = state.maxLevelReached || 0;
        this.completed = !!state.completed;
        this.sectionStopBravoHold = !!state.sectionStopBravoHold;
        this.asukaTransitionStatus = state.asukaTransitionStatus || null;
        this.currentRotationSystem = gameScene?.rotationSystem || this.currentRotationSystem;
        this.currentTiming = this.getTimingForLevel(gameScene?.level || 0);
        if (gameScene) {
            gameScene.kitas = this.kitas;
        }
    }

    update(gameScene) {
        this.gameSceneRef = gameScene || this.gameSceneRef;
        if (gameScene?.rotationSystem) {
            this.currentRotationSystem = gameScene.rotationSystem;
            this.currentTiming = this.getTimingForLevel(gameScene.level || 0);
        }
        if (!gameScene || gameScene.gameOver) return;
        if (!this.timerStarted && gameScene.currentPiece) {
            this.timerStarted = true;
            this.lastTimerTime = gameScene.currentTime || 0;
        }
        if (!this.timerStarted || this.timeExpired) return;

        const now = gameScene.currentTime || 0;
        const delta = this.lastTimerTime === null ? 0 : Math.max(0, now - this.lastTimerTime);
        this.lastTimerTime = now;
        this.timeRemaining = Math.max(0, this.timeRemaining - delta);
        if (this.timeRemaining <= 0) {
            this.timeExpired = true;
            gameScene.showGameOverScreen();
        }
    }
}

class TGM4AsukaEasyMode extends TGM4AsukaMode { constructor() { super('easy'); } }
class TGM4AsukaNormalMode extends TGM4AsukaMode { constructor() { super('normal'); } }
class TGM4AsukaHardMode extends TGM4AsukaMode { constructor() { super('hard'); } }

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { TGM4AsukaMode, TGM4AsukaEasyMode, TGM4AsukaNormalMode, TGM4AsukaHardMode };
}
if (typeof window !== 'undefined') {
    window.TGM4AsukaMode = TGM4AsukaMode;
    window.TGM4AsukaEasyMode = TGM4AsukaEasyMode;
    window.TGM4AsukaNormalMode = TGM4AsukaNormalMode;
    window.TGM4AsukaHardMode = TGM4AsukaHardMode;
}
