const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const W = canvas.width, H = canvas.height;
const GROUND = H - 80;

let gameState = 'start';
let round = 1;
let timer = 99;
let timerInterval = null;
let p1Wins = 0, p2Wins = 0;
let particles = [];
let screenShake = 0;

// === FIGHTER CLASS ===
class Fighter {
    constructor(x, facing, name, type) {
        this.x = x;
        this.y = GROUND;
        this.vx = 0;
        this.vy = 0;
        this.width = 50;
        this.height = 120;
        this.facing = facing;
        this.name = name;
        this.type = type; // 'viper' or 'shaman'
        this.health = 100;
        this.superMeter = 0;
        this.state = 'idle';
        this.stateTimer = 0;
        this.animFrame = 0;
        this.animTimer = 0;
        this.combo = 0;
        this.comboTimer = 0;
        this.isBlocking = false;
        this.attackHit = false;
        this.grounded = true;
    }

    reset(x) {
        this.x = x; this.y = GROUND; this.vx = 0; this.vy = 0;
        this.health = 100; this.superMeter = 0; this.state = 'idle';
        this.stateTimer = 0; this.combo = 0; this.comboTimer = 0;
        this.isBlocking = false; this.grounded = true;
    }

    getHitbox() {
        return { x: this.x - this.width/2, y: this.y - this.height, w: this.width, h: this.height };
    }

    getAttackBox() {
        if (this.state === 'punch' && this.stateTimer > 5 && this.stateTimer < 15)
            return { x: this.x + this.facing * 30, y: this.y - 90, w: 55, h: 30 };
        if (this.state === 'kick' && this.stateTimer > 8 && this.stateTimer < 18)
            return { x: this.x + this.facing * 25, y: this.y - 45, w: 65, h: 35 };
        if (this.state === 'special' && this.stateTimer > 10 && this.stateTimer < 25)
            return { x: this.x + this.facing * 20, y: this.y - 100, w: 90, h: 90 };
        return null;
    }

    getDamage() {
        if (this.state === 'punch') return 8;
        if (this.state === 'kick') return 12;
        if (this.state === 'special') return 25;
        return 0;
    }

    attack(type) {
        if (this.state !== 'idle' && this.state !== 'walk') return;
        if (type === 'special' && this.superMeter < 50) return;
        this.state = type; this.stateTimer = 0; this.attackHit = false;
        if (type === 'special') this.superMeter -= 50;
    }

    takeDamage(dmg, attacker) {
        if (this.isBlocking) {
            dmg = Math.floor(dmg * 0.2); this.state = 'block'; this.stateTimer = 0;
        } else {
            this.state = 'hit'; this.stateTimer = 0; this.vx = -this.facing * 8;
            attacker.combo++; attacker.comboTimer = 90;
            if (attacker.combo > 1) dmg = Math.floor(dmg * (1 + attacker.combo * 0.15));
        }
        this.health = Math.max(0, this.health - dmg);
        attacker.superMeter = Math.min(100, attacker.superMeter + dmg * 0.8);
        screenShake = 8;
        spawnHitParticles(this.x, this.y - 60, this.type === 'viper' ? '#cc44ff' : '#00cccc');
    }

    update() {
        this.animTimer++;
        if (this.animTimer > 6) { this.animTimer = 0; this.animFrame++; }
        if (this.comboTimer > 0) { this.comboTimer--; if (this.comboTimer === 0) this.combo = 0; }
        this.stateTimer++;
        if (this.state === 'punch' && this.stateTimer > 20) this.state = 'idle';
        if (this.state === 'kick' && this.stateTimer > 25) this.state = 'idle';
        if (this.state === 'special' && this.stateTimer > 40) this.state = 'idle';
        if (this.state === 'hit' && this.stateTimer > 15) this.state = 'idle';
        if (this.state === 'block' && this.stateTimer > 10) this.state = 'idle';
        this.x += this.vx; this.y += this.vy; this.vx *= 0.85;
        if (!this.grounded) {
            this.vy += 0.8;
            if (this.y >= GROUND) { this.y = GROUND; this.vy = 0; this.grounded = true; if (this.state === 'jump') this.state = 'idle'; }
        }
        this.x = Math.max(50, Math.min(W - 50, this.x));
        if (this.health <= 0 && this.state !== 'ko') { this.state = 'ko'; this.stateTimer = 0; }
    }

    draw() {
        ctx.save();
        ctx.translate(this.x, this.y);
        if (this.facing === -1) { ctx.scale(-1, 1); }

        if (this.type === 'viper') this.drawViper();
        else this.drawShaman();

        ctx.restore();
    }


    // === VIPER - Cyberpunk girl with purple hair, leather jacket, boots ===
    drawViper() {
        const bob = Math.sin(this.animFrame * 0.4) * 2;
        const t = this.stateTimer;
        let bodyY = bob;
        let punchExt = 0, kickExt = 0;

        if (this.state === 'hit') bodyY = -4;
        if (this.state === 'block') bodyY = 4;
        if (this.state === 'punch') { punchExt = t < 10 ? t/10 : Math.max(0, 1-(t-10)/10); }
        if (this.state === 'kick') { kickExt = t < 12 ? t/12 : Math.max(0, 1-(t-12)/13); }

        // Shadow
        ctx.fillStyle = 'rgba(100,0,150,0.25)';
        ctx.beginPath(); ctx.ellipse(0, 2, 25, 7, 0, 0, Math.PI*2); ctx.fill();

        if (this.state === 'ko') { this.drawViperKO(); return; }

        // === BOOTS (black with green laces) ===
        ctx.fillStyle = '#1a1a1a';
        // Left boot
        ctx.fillRect(-14, -12 + bodyY, 10, 14);
        ctx.fillStyle = '#114433';
        ctx.fillRect(-12, -10 + bodyY, 2, 10);
        // Right boot / kick
        ctx.fillStyle = '#1a1a1a';
        if (this.state === 'kick') {
            ctx.save();
            ctx.translate(8, -15 + bodyY);
            ctx.rotate(kickExt * 1.2);
            ctx.fillRect(-5, 0, 10, 16);
            ctx.fillStyle = '#114433';
            ctx.fillRect(-3, 2, 2, 12);
            ctx.restore();
        } else {
            ctx.fillRect(4, -12 + bodyY, 10, 14);
            ctx.fillStyle = '#114433';
            ctx.fillRect(6, -10 + bodyY, 2, 10);
        }

        // === LEGS (shiny black leather pants) ===
        const legGrad = ctx.createLinearGradient(-15, -55, 15, -55);
        legGrad.addColorStop(0, '#0a0a0a');
        legGrad.addColorStop(0.4, '#2a2a2a');
        legGrad.addColorStop(0.6, '#2a2a2a');
        legGrad.addColorStop(1, '#0a0a0a');
        ctx.fillStyle = legGrad;
        ctx.fillRect(-15, -55 + bodyY, 30, 45);

        // Gold trim on pants
        ctx.fillStyle = '#aa8833';
        ctx.fillRect(-15, -30 + bodyY, 30, 2);
        ctx.fillRect(-15, -52 + bodyY, 30, 2);

        // Checkered belt
        ctx.fillStyle = '#222';
        ctx.fillRect(-16, -57 + bodyY, 32, 6);
        for (let i = 0; i < 8; i++) {
            if (i % 2 === 0) { ctx.fillStyle = '#fff'; ctx.fillRect(-16 + i*4, -57 + bodyY, 4, 3); }
        }
        // Belt buckle
        ctx.fillStyle = '#silver';
        ctx.beginPath(); ctx.arc(0, -54 + bodyY, 4, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = '#aaa';
        ctx.beginPath(); ctx.arc(0, -54 + bodyY, 3, 0, Math.PI*2); ctx.fill();

        // === TORSO (black crop top) ===
        ctx.fillStyle = '#111';
        ctx.fillRect(-14, -80 + bodyY, 28, 25);
        // Silver trim on top
        ctx.fillStyle = '#999';
        ctx.fillRect(-14, -80 + bodyY, 28, 2);
        ctx.fillRect(-14, -58 + bodyY, 28, 2);
        // Midriff (skin)
        ctx.fillStyle = '#f0d0b8';
        ctx.fillRect(-12, -57 + bodyY, 24, 5);

        // === JACKET (purple, open, flowing) ===
        const jacketGrad = ctx.createLinearGradient(-25, -95, 25, -95);
        jacketGrad.addColorStop(0, '#6a1b9a');
        jacketGrad.addColorStop(0.3, '#9c27b0');
        jacketGrad.addColorStop(0.7, '#7b1fa2');
        jacketGrad.addColorStop(1, '#4a148c');
        ctx.fillStyle = jacketGrad;
        // Left side of jacket
        ctx.beginPath();
        ctx.moveTo(-14, -80 + bodyY);
        ctx.lineTo(-25, -78 + bodyY);
        ctx.lineTo(-28, -55 + bodyY);
        ctx.lineTo(-14, -55 + bodyY);
        ctx.fill();
        // Right side of jacket
        ctx.beginPath();
        ctx.moveTo(14, -80 + bodyY);
        ctx.lineTo(25, -78 + bodyY);
        ctx.lineTo(28, -55 + bodyY);
        ctx.lineTo(14, -55 + bodyY);
        ctx.fill();
        // Jacket collar
        ctx.fillStyle = '#9c27b0';
        ctx.fillRect(-16, -82 + bodyY, 32, 4);
        // Jacket shine
        ctx.fillStyle = 'rgba(255,200,255,0.15)';
        ctx.fillRect(-24, -76 + bodyY, 8, 15);
        ctx.fillRect(18, -76 + bodyY, 6, 12);

        // === ARMS ===
        ctx.lineWidth = 6; ctx.lineCap = 'round';
        // Back arm (jacket sleeve)
        ctx.strokeStyle = '#7b1fa2';
        ctx.beginPath(); ctx.moveTo(-12, -75 + bodyY); ctx.lineTo(-22, -60 + bodyY); ctx.stroke();
        ctx.strokeStyle = '#f0d0b8';
        ctx.lineWidth = 5;
        ctx.beginPath(); ctx.moveTo(-22, -60 + bodyY); ctx.lineTo(-20, -50 + bodyY); ctx.stroke();

        // Front arm (punch arm)
        if (this.state === 'punch') {
            ctx.strokeStyle = '#7b1fa2';
            ctx.lineWidth = 7;
            ctx.beginPath(); ctx.moveTo(12, -75 + bodyY);
            ctx.lineTo(12 + 45 * punchExt, -75 + bodyY); ctx.stroke();
            // Fist
            ctx.fillStyle = '#f0d0b8';
            ctx.beginPath(); ctx.arc(12 + 50 * punchExt, -75 + bodyY, 6, 0, Math.PI*2); ctx.fill();
            // Punch trail
            if (punchExt > 0.5) {
                ctx.strokeStyle = 'rgba(200,100,255,0.4)';
                ctx.lineWidth = 3;
                for (let i = 0; i < 3; i++) {
                    ctx.beginPath();
                    ctx.moveTo(12 + 30*punchExt - i*10, -75 + bodyY + (Math.random()-0.5)*10);
                    ctx.lineTo(12 + 40*punchExt - i*10, -75 + bodyY + (Math.random()-0.5)*10);
                    ctx.stroke();
                }
            }
        } else {
            ctx.strokeStyle = '#7b1fa2';
            ctx.lineWidth = 6;
            ctx.beginPath(); ctx.moveTo(12, -75 + bodyY); ctx.lineTo(22, -60 + bodyY); ctx.stroke();
            ctx.strokeStyle = '#f0d0b8';
            ctx.lineWidth = 5;
            ctx.beginPath(); ctx.moveTo(22, -60 + bodyY); ctx.lineTo(20, -50 + bodyY); ctx.stroke();
        }

        // === HEAD ===
        // Neck
        ctx.fillStyle = '#f0d0b8';
        ctx.fillRect(-4, -86 + bodyY, 8, 6);
        // Face
        ctx.fillStyle = '#f5dcc8';
        ctx.beginPath(); ctx.ellipse(0, -96 + bodyY, 12, 14, 0, 0, Math.PI*2); ctx.fill();
        // Eyes
        ctx.fillStyle = '#333';
        ctx.fillRect(-6, -98 + bodyY, 4, 3);
        ctx.fillRect(3, -98 + bodyY, 4, 3);
        // Eye shine
        ctx.fillStyle = '#fff';
        ctx.fillRect(-5, -98 + bodyY, 1.5, 1.5);
        ctx.fillRect(4, -98 + bodyY, 1.5, 1.5);
        // Lips
        ctx.fillStyle = '#cc3333';
        ctx.fillRect(-3, -91 + bodyY, 6, 2);

        // === HAIR (long purple/blue, braided) ===
        const hairGrad = ctx.createLinearGradient(-15, -115, 15, -80);
        hairGrad.addColorStop(0, '#7733cc');
        hairGrad.addColorStop(0.5, '#5522aa');
        hairGrad.addColorStop(1, '#3311aa');
        ctx.fillStyle = hairGrad;
        // Top hair
        ctx.beginPath();
        ctx.moveTo(-14, -96 + bodyY);
        ctx.quadraticCurveTo(-16, -115 + bodyY, 0, -118 + bodyY);
        ctx.quadraticCurveTo(16, -115 + bodyY, 14, -96 + bodyY);
        ctx.fill();
        // Bangs
        ctx.fillRect(-10, -105 + bodyY, 20, 8);
        // Long braid going down the back
        ctx.strokeStyle = '#6633bb';
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.moveTo(-8, -95 + bodyY);
        ctx.quadraticCurveTo(-15, -70 + bodyY, -10, -45 + bodyY);
        ctx.quadraticCurveTo(-8, -30 + bodyY, -12, -15 + bodyY);
        ctx.stroke();
        // Braid segments
        ctx.strokeStyle = '#8844dd';
        ctx.lineWidth = 2;
        for (let i = 0; i < 5; i++) {
            const by = -90 + i*15 + bodyY;
            ctx.beginPath(); ctx.moveTo(-12, by); ctx.lineTo(-8, by+3); ctx.stroke();
        }
        // Braid tip/ribbon
        ctx.fillStyle = '#ffcc00';
        ctx.beginPath(); ctx.arc(-12, -12 + bodyY, 3, 0, Math.PI*2); ctx.fill();

        // === GOGGLES on head ===
        ctx.strokeStyle = '#6699cc';
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(-6, -108 + bodyY, 5, 0, Math.PI*2); ctx.stroke();
        ctx.beginPath(); ctx.arc(6, -108 + bodyY, 5, 0, Math.PI*2); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(-1, -108 + bodyY); ctx.lineTo(1, -108 + bodyY); ctx.stroke();
        // Goggle lens
        ctx.fillStyle = 'rgba(100,180,255,0.4)';
        ctx.beginPath(); ctx.arc(-6, -108 + bodyY, 4, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(6, -108 + bodyY, 4, 0, Math.PI*2); ctx.fill();

        // === SPECIAL MOVE EFFECT ===
        if (this.state === 'special' && this.stateTimer > 5 && this.stateTimer < 35) {
            const alpha = this.stateTimer < 15 ? (this.stateTimer-5)/10 : Math.max(0, (35-this.stateTimer)/20);
            ctx.globalAlpha = alpha;
            // Purple energy burst
            const sGrad = ctx.createRadialGradient(35, -70+bodyY, 5, 35, -70+bodyY, 40+this.stateTimer);
            sGrad.addColorStop(0, '#ff00ff');
            sGrad.addColorStop(0.5, '#9900cc');
            sGrad.addColorStop(1, 'rgba(100,0,200,0)');
            ctx.fillStyle = sGrad;
            ctx.beginPath(); ctx.arc(35, -70+bodyY, 35+this.stateTimer*0.5, 0, Math.PI*2); ctx.fill();
            // Lightning bolts
            ctx.strokeStyle = '#ffccff';
            ctx.lineWidth = 2;
            for (let i = 0; i < 4; i++) {
                const angle = (this.stateTimer*0.2 + i*1.5);
                ctx.beginPath();
                ctx.moveTo(35 + Math.cos(angle)*20, -70+bodyY + Math.sin(angle)*20);
                ctx.lineTo(35 + Math.cos(angle)*35, -70+bodyY + Math.sin(angle)*35);
                ctx.stroke();
            }
            ctx.globalAlpha = 1;
        }

        // Block shield
        if (this.state === 'block') {
            ctx.strokeStyle = 'rgba(200,100,255,0.5)';
            ctx.lineWidth = 3;
            ctx.setLineDash([4,4]);
            ctx.beginPath(); ctx.arc(5, -65+bodyY, 32, -Math.PI/2, Math.PI/2); ctx.stroke();
            ctx.setLineDash([]);
        }

        // Hit flash
        if (this.state === 'hit' && this.stateTimer < 5) {
            ctx.fillStyle = 'rgba(255,100,255,0.4)';
            ctx.fillRect(-28, -120+bodyY, 56, 130);
        }
    }

    drawViperKO() {
        const bodyY = 0;
        // Fallen body
        ctx.fillStyle = '#111';
        ctx.fillRect(-35, -12, 70, 12);
        // Jacket on ground
        ctx.fillStyle = '#7b1fa2';
        ctx.fillRect(-30, -14, 20, 14);
        // Head
        ctx.fillStyle = '#f5dcc8';
        ctx.beginPath(); ctx.ellipse(-30, -16, 10, 12, -0.3, 0, Math.PI*2); ctx.fill();
        // Hair spread
        ctx.fillStyle = '#6633bb';
        ctx.fillRect(-42, -20, 15, 6);
    }


    // === SHAMAN - Tribal warrior with antler skull, staff, dark robes ===
    drawShaman() {
        const bob = Math.sin(this.animFrame * 0.35) * 1.5;
        const t = this.stateTimer;
        let bodyY = bob;
        let punchExt = 0, kickExt = 0;

        if (this.state === 'hit') bodyY = -4;
        if (this.state === 'block') bodyY = 4;
        if (this.state === 'punch') { punchExt = t < 10 ? t/10 : Math.max(0, 1-(t-10)/10); }
        if (this.state === 'kick') { kickExt = t < 12 ? t/12 : Math.max(0, 1-(t-12)/13); }

        // Shadow
        ctx.fillStyle = 'rgba(0,100,100,0.2)';
        ctx.beginPath(); ctx.ellipse(0, 2, 28, 8, 0, 0, Math.PI*2); ctx.fill();

        if (this.state === 'ko') { this.drawShamanKO(); return; }

        // === FEET/SANDALS ===
        ctx.fillStyle = '#3d2b1f';
        ctx.fillRect(-12, -10 + bodyY, 9, 12);
        if (this.state === 'kick') {
            ctx.save();
            ctx.translate(8, -12 + bodyY);
            ctx.rotate(kickExt * 1.3);
            ctx.fillRect(-4, 0, 9, 14);
            ctx.restore();
        } else {
            ctx.fillRect(4, -10 + bodyY, 9, 12);
        }
        // Ankle wraps
        ctx.strokeStyle = '#5c4033';
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(-10, -8+bodyY); ctx.lineTo(-6, -4+bodyY); ctx.lineTo(-10, 0+bodyY); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(6, -8+bodyY); ctx.lineTo(10, -4+bodyY); ctx.lineTo(6, 0+bodyY); ctx.stroke();

        // === LEGS (exposed leg with wraps) ===
        // Left leg covered by robe
        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(-15, -50 + bodyY, 13, 42);
        // Right leg (exposed, skin tone with straps)
        ctx.fillStyle = '#e8c8a8';
        ctx.fillRect(3, -50 + bodyY, 12, 42);
        // Cross straps on right leg
        ctx.strokeStyle = '#2a2a2a';
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(3, -45+bodyY); ctx.lineTo(15, -35+bodyY); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(15, -45+bodyY); ctx.lineTo(3, -35+bodyY); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(3, -30+bodyY); ctx.lineTo(15, -20+bodyY); ctx.stroke();

        // === WAIST/BELT (bone and leather) ===
        ctx.fillStyle = '#2a1f14';
        ctx.fillRect(-16, -54 + bodyY, 32, 7);
        // Bone ornaments on belt
        ctx.fillStyle = '#e8dcc8';
        ctx.beginPath(); ctx.arc(-8, -51+bodyY, 3, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(0, -51+bodyY, 3, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(8, -51+bodyY, 3, 0, Math.PI*2); ctx.fill();
        // Chains
        ctx.strokeStyle = '#aa8833';
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(-8, -48+bodyY); ctx.quadraticCurveTo(0, -43+bodyY, 8, -48+bodyY); ctx.stroke();

        // === TORSO (dark navy cloth/armor with chains) ===
        ctx.fillStyle = '#1a1a3a';
        ctx.fillRect(-14, -82 + bodyY, 28, 30);
        // Gold necklace/chains
        ctx.strokeStyle = '#cc9933';
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(0, -72+bodyY, 10, 0.3, Math.PI-0.3); ctx.stroke();
        ctx.beginPath(); ctx.arc(0, -68+bodyY, 13, 0.5, Math.PI-0.5); ctx.stroke();
        // Pendant
        ctx.fillStyle = '#00ccaa';
        ctx.beginPath(); ctx.arc(0, -62+bodyY, 3, 0, Math.PI*2); ctx.fill();

        // === CAPE/ROBE (dark flowing fabric) ===
        const capeGrad = ctx.createLinearGradient(-30, -90, 30, -50);
        capeGrad.addColorStop(0, '#1a1a2e');
        capeGrad.addColorStop(1, '#0a0a1a');
        ctx.fillStyle = capeGrad;
        // Left cape
        ctx.beginPath();
        ctx.moveTo(-14, -82+bodyY);
        ctx.lineTo(-28, -78+bodyY);
        ctx.lineTo(-30, -20+bodyY);
        ctx.lineTo(-14, -30+bodyY);
        ctx.fill();
        // Right cape
        ctx.beginPath();
        ctx.moveTo(14, -82+bodyY);
        ctx.lineTo(28, -78+bodyY);
        ctx.lineTo(26, -20+bodyY);
        ctx.lineTo(14, -30+bodyY);
        ctx.fill();
        // Cape bottom flow
        ctx.fillStyle = '#1a1a2e';
        ctx.beginPath();
        ctx.moveTo(-28, -20+bodyY);
        ctx.quadraticCurveTo(-25, -10+bodyY + Math.sin(this.animFrame*0.3)*3, -30, 0+bodyY);
        ctx.lineTo(-20, 0+bodyY);
        ctx.lineTo(-14, -30+bodyY);
        ctx.fill();

        // === FUR SHOULDERS ===
        ctx.fillStyle = '#d4c8b0';
        // Left shoulder fur
        ctx.beginPath();
        ctx.moveTo(-14, -82+bodyY);
        ctx.quadraticCurveTo(-25, -88+bodyY, -22, -78+bodyY);
        ctx.lineTo(-14, -75+bodyY);
        ctx.fill();
        // Right shoulder fur
        ctx.beginPath();
        ctx.moveTo(14, -82+bodyY);
        ctx.quadraticCurveTo(25, -88+bodyY, 22, -78+bodyY);
        ctx.lineTo(14, -75+bodyY);
        ctx.fill();
        // Fur texture
        ctx.strokeStyle = '#b0a890';
        ctx.lineWidth = 1;
        for (let i = 0; i < 4; i++) {
            ctx.beginPath(); ctx.moveTo(-20+i*2, -85+bodyY); ctx.lineTo(-19+i*2, -80+bodyY); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(16+i*2, -85+bodyY); ctx.lineTo(17+i*2, -80+bodyY); ctx.stroke();
        }

        // === ARMS ===
        ctx.lineWidth = 6; ctx.lineCap = 'round';
        // Back arm
        ctx.strokeStyle = '#1a1a3a';
        ctx.beginPath(); ctx.moveTo(-12, -78+bodyY); ctx.lineTo(-20, -60+bodyY); ctx.stroke();
        // Bracer
        ctx.strokeStyle = '#aa8833';
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(-19, -63+bodyY); ctx.lineTo(-21, -57+bodyY); ctx.stroke();

        // Front arm + STAFF
        if (this.state === 'punch') {
            // Staff thrust
            ctx.strokeStyle = '#4a3728';
            ctx.lineWidth = 5;
            ctx.beginPath();
            ctx.moveTo(12, -78+bodyY);
            ctx.lineTo(12 + 50*punchExt, -78+bodyY);
            ctx.stroke();
            // Staff skull head
            ctx.fillStyle = '#d4c8b0';
            ctx.beginPath(); ctx.arc(12 + 55*punchExt, -78+bodyY, 7, 0, Math.PI*2); ctx.fill();
            ctx.fillStyle = '#111';
            ctx.fillRect(12 + 52*punchExt, -80+bodyY, 3, 2);
            ctx.fillRect(12 + 57*punchExt, -80+bodyY, 3, 2);
        } else {
            // Staff held at side
            ctx.strokeStyle = '#4a3728';
            ctx.lineWidth = 5;
            ctx.beginPath();
            ctx.moveTo(18, -110+bodyY);
            ctx.lineTo(14, -10+bodyY);
            ctx.stroke();
            // Staff skull
            ctx.fillStyle = '#d4c8b0';
            ctx.beginPath(); ctx.arc(18, -113+bodyY, 7, 0, Math.PI*2); ctx.fill();
            ctx.fillStyle = '#333';
            ctx.fillRect(15, -115+bodyY, 3, 2);
            ctx.fillRect(19, -115+bodyY, 3, 2);
            // Skull horns on staff
            ctx.strokeStyle = '#8b7355';
            ctx.lineWidth = 2;
            ctx.beginPath(); ctx.moveTo(13, -117+bodyY); ctx.lineTo(8, -125+bodyY); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(23, -117+bodyY); ctx.lineTo(28, -125+bodyY); ctx.stroke();
            // Green energy wrap on staff
            ctx.strokeStyle = 'rgba(0,220,180,0.4)';
            ctx.lineWidth = 2;
            ctx.setLineDash([3,3]);
            ctx.beginPath(); ctx.moveTo(16, -90+bodyY); ctx.lineTo(17, -70+bodyY); ctx.lineTo(15, -50+bodyY); ctx.stroke();
            ctx.setLineDash([]);
            // Arm
            ctx.strokeStyle = '#e8c8a8';
            ctx.lineWidth = 5;
            ctx.beginPath(); ctx.moveTo(12, -78+bodyY); ctx.lineTo(16, -60+bodyY); ctx.stroke();
        }

        // === HEAD ===
        ctx.fillStyle = '#e8c8a8';
        ctx.beginPath(); ctx.ellipse(0, -96+bodyY, 11, 13, 0, 0, Math.PI*2); ctx.fill();
        // Face paint (red marks)
        ctx.strokeStyle = '#cc3333';
        ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(-5, -94+bodyY); ctx.lineTo(-7, -88+bodyY); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(5, -94+bodyY); ctx.lineTo(7, -88+bodyY); ctx.stroke();
        // Eyes
        ctx.fillStyle = '#2a4a2a';
        ctx.fillRect(-5, -98+bodyY, 3, 3);
        ctx.fillRect(3, -98+bodyY, 3, 3);
        // Dark hair
        ctx.fillStyle = '#1a1a1a';
        ctx.beginPath();
        ctx.moveTo(-12, -98+bodyY);
        ctx.quadraticCurveTo(-13, -110+bodyY, 0, -112+bodyY);
        ctx.quadraticCurveTo(13, -110+bodyY, 12, -98+bodyY);
        ctx.lineTo(8, -100+bodyY);
        ctx.lineTo(-8, -100+bodyY);
        ctx.fill();
        // Teal feather in hair
        ctx.fillStyle = '#00aaaa';
        ctx.beginPath();
        ctx.moveTo(-8, -108+bodyY); ctx.lineTo(-12, -118+bodyY); ctx.lineTo(-6, -112+bodyY);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(5, -108+bodyY); ctx.lineTo(8, -118+bodyY); ctx.lineTo(3, -112+bodyY);
        ctx.fill();

        // === SKULL CROWN WITH ANTLERS ===
        // Main skull
        ctx.fillStyle = '#e8dcc8';
        ctx.beginPath(); ctx.ellipse(0, -115+bodyY, 10, 8, 0, 0, Math.PI*2); ctx.fill();
        // Skull eye sockets
        ctx.fillStyle = '#1a1a1a';
        ctx.beginPath(); ctx.ellipse(-4, -115+bodyY, 3, 3, 0, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(4, -115+bodyY, 3, 3, 0, 0, Math.PI*2); ctx.fill();
        // Nose
        ctx.fillStyle = '#1a1a1a';
        ctx.beginPath(); ctx.moveTo(-1, -112+bodyY); ctx.lineTo(1, -112+bodyY); ctx.lineTo(0, -110+bodyY); ctx.fill();
        // ANTLERS
        ctx.strokeStyle = '#5c4033';
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        // Left antler
        ctx.beginPath();
        ctx.moveTo(-8, -118+bodyY);
        ctx.lineTo(-18, -132+bodyY);
        ctx.stroke();
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(-13, -126+bodyY); ctx.lineTo(-20, -136+bodyY); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(-15, -129+bodyY); ctx.lineTo(-10, -138+bodyY); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(-17, -131+bodyY); ctx.lineTo(-22, -140+bodyY); ctx.stroke();
        // Right antler
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(8, -118+bodyY);
        ctx.lineTo(18, -132+bodyY);
        ctx.stroke();
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(13, -126+bodyY); ctx.lineTo(20, -136+bodyY); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(15, -129+bodyY); ctx.lineTo(10, -138+bodyY); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(17, -131+bodyY); ctx.lineTo(22, -140+bodyY); ctx.stroke();

        // === SPECIAL MOVE - Spectral energy ===
        if (this.state === 'special' && this.stateTimer > 5 && this.stateTimer < 35) {
            const alpha = this.stateTimer < 15 ? (this.stateTimer-5)/10 : Math.max(0, (35-this.stateTimer)/20);
            ctx.globalAlpha = alpha;
            // Green spectral energy
            const sGrad = ctx.createRadialGradient(30, -70+bodyY, 5, 30, -70+bodyY, 45+this.stateTimer*0.8);
            sGrad.addColorStop(0, '#00ffaa');
            sGrad.addColorStop(0.4, '#009977');
            sGrad.addColorStop(1, 'rgba(0,100,80,0)');
            ctx.fillStyle = sGrad;
            ctx.beginPath(); ctx.arc(30, -70+bodyY, 40+this.stateTimer*0.5, 0, Math.PI*2); ctx.fill();
            // Skull spirits
            ctx.fillStyle = '#aaffcc';
            for (let i = 0; i < 3; i++) {
                const sx = 30 + Math.cos(this.stateTimer*0.15 + i*2)*25;
                const sy = -70 + bodyY + Math.sin(this.stateTimer*0.15 + i*2)*25;
                ctx.beginPath(); ctx.arc(sx, sy, 5, 0, Math.PI*2); ctx.fill();
                ctx.fillStyle = '#005544';
                ctx.fillRect(sx-2, sy-1, 2, 1);
                ctx.fillRect(sx+1, sy-1, 2, 1);
                ctx.fillStyle = '#aaffcc';
            }
            ctx.globalAlpha = 1;
        }

        // Block shield
        if (this.state === 'block') {
            ctx.strokeStyle = 'rgba(0,200,150,0.5)';
            ctx.lineWidth = 3;
            ctx.setLineDash([5,3]);
            ctx.beginPath(); ctx.arc(5, -65+bodyY, 35, -Math.PI/2, Math.PI/2); ctx.stroke();
            ctx.setLineDash([]);
            // Rune symbols
            ctx.fillStyle = 'rgba(0,255,180,0.3)';
            ctx.font = '12px serif';
            ctx.fillText('⛧', 25, -80+bodyY);
            ctx.fillText('☽', 30, -55+bodyY);
        }

        // Hit flash
        if (this.state === 'hit' && this.stateTimer < 5) {
            ctx.fillStyle = 'rgba(0,255,200,0.3)';
            ctx.fillRect(-30, -140+bodyY, 60, 150);
        }
    }

    drawShamanKO() {
        // Fallen body with robes spread
        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(-35, -14, 70, 14);
        // Body
        ctx.fillStyle = '#e8c8a8';
        ctx.beginPath(); ctx.ellipse(20, -16, 10, 11, 0.2, 0, Math.PI*2); ctx.fill();
        // Staff fallen
        ctx.strokeStyle = '#4a3728';
        ctx.lineWidth = 4;
        ctx.beginPath(); ctx.moveTo(-35, -5); ctx.lineTo(35, -8); ctx.stroke();
        // Skull crown fallen
        ctx.fillStyle = '#e8dcc8';
        ctx.beginPath(); ctx.arc(-25, -18, 6, 0, Math.PI*2); ctx.fill();
    }
}


// === PARTICLES ===
function spawnHitParticles(x, y, color) {
    for (let i = 0; i < 15; i++) {
        particles.push({ x, y, vx: (Math.random()-0.5)*16, vy: (Math.random()-0.5)*16,
            life: 20+Math.random()*15, maxLife: 35, size: 3+Math.random()*6, color });
    }
}
function updateParticles() {
    for (let i = particles.length-1; i >= 0; i--) {
        let p = particles[i]; p.x += p.vx; p.y += p.vy; p.vx *= 0.91; p.vy *= 0.91; p.life--;
        if (p.life <= 0) particles.splice(i, 1);
    }
}
function drawParticles() {
    particles.forEach(p => {
        ctx.globalAlpha = p.life/p.maxLife;
        ctx.fillStyle = p.color;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size/2, 0, Math.PI*2); ctx.fill();
    });
    ctx.globalAlpha = 1;
}

// === CREATE FIGHTERS ===
let p1 = new Fighter(200, 1, 'VIPER', 'viper');
let p2 = new Fighter(800, -1, 'SHAMAN', 'shaman');

// === INPUT ===
const keys = {};
document.addEventListener('keydown', e => {
    keys[e.key.toLowerCase()] = true;
    if (e.code === 'Space') { e.preventDefault(); if (gameState === 'start') startGame(); if (gameState === 'gameOver') resetGame(); }
});
document.addEventListener('keyup', e => { keys[e.key.toLowerCase()] = false; });

// === BACKGROUND ===
function drawBackground() {
    // Dark arena with purple/teal mood
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, '#0a0015');
    grad.addColorStop(0.4, '#0d0d1a');
    grad.addColorStop(0.7, '#0a1515');
    grad.addColorStop(1, '#050505');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    // Spotlight from above
    ctx.fillStyle = 'rgba(150, 100, 200, 0.025)';
    ctx.beginPath(); ctx.moveTo(W/2, 0); ctx.lineTo(W/2-350, H); ctx.lineTo(W/2+350, H); ctx.fill();

    // Side mood lights
    ctx.fillStyle = 'rgba(200,0,255,0.015)';
    ctx.fillRect(0, 0, 100, H);
    ctx.fillStyle = 'rgba(0,200,200,0.015)';
    ctx.fillRect(W-100, 0, 100, H);

    // Floor
    const floorGrad = ctx.createLinearGradient(0, GROUND, 0, H);
    floorGrad.addColorStop(0, '#222');
    floorGrad.addColorStop(1, '#0a0a0a');
    ctx.fillStyle = floorGrad;
    ctx.fillRect(0, GROUND, W, H-GROUND);

    // Floor line glow
    ctx.strokeStyle = 'rgba(150,50,200,0.3)';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(50, GROUND+2); ctx.lineTo(W-50, GROUND+2); ctx.stroke();

    // Floor tiles
    ctx.strokeStyle = 'rgba(255,255,255,0.03)';
    ctx.lineWidth = 1;
    for (let i = 0; i < W; i += 60) {
        ctx.beginPath(); ctx.moveTo(i, GROUND); ctx.lineTo(i, H); ctx.stroke();
    }
}

// === COLLISION ===
function boxOverlap(a, b) { if (!a||!b) return false; return a.x < b.x+b.w && a.x+a.w > b.x && a.y < b.y+b.h && a.y+a.h > b.y; }

// === INPUT HANDLING ===
function handleInput() {
    if (gameState !== 'fighting') return;
    if (p1.state === 'idle' || p1.state === 'walk') {
        if (keys['a']) { p1.vx = -5; p1.state = 'walk'; }
        else if (keys['d']) { p1.vx = 5; p1.state = 'walk'; }
        else if (p1.state === 'walk') p1.state = 'idle';
        if (keys['w'] && p1.grounded) { p1.vy = -15; p1.grounded = false; p1.state = 'jump'; }
        p1.isBlocking = !!keys['s'];
    }
    if (keys['f']) p1.attack('punch');
    if (keys['g']) p1.attack('kick');
    if (keys['h']) p1.attack('special');
    if (p2.state === 'idle' || p2.state === 'walk') {
        if (keys['arrowleft']) { p2.vx = -5; p2.state = 'walk'; }
        else if (keys['arrowright']) { p2.vx = 5; p2.state = 'walk'; }
        else if (p2.state === 'walk') p2.state = 'idle';
        if (keys['arrowup'] && p2.grounded) { p2.vy = -15; p2.grounded = false; p2.state = 'jump'; }
        p2.isBlocking = !!keys['arrowdown'];
    }
    if (keys['j']) p2.attack('punch');
    if (keys['k']) p2.attack('kick');
    if (keys['l']) p2.attack('special');
}

// === COMBAT ===
function handleCombat() {
    const p1Attack = p1.getAttackBox(), p2Hit = p2.getHitbox();
    if (p1Attack && !p1.attackHit && boxOverlap(p1Attack, p2Hit)) { p1.attackHit = true; p2.takeDamage(p1.getDamage(), p1); }
    const p2Attack = p2.getAttackBox(), p1Hit = p1.getHitbox();
    if (p2Attack && !p2.attackHit && boxOverlap(p2Attack, p1Hit)) { p2.attackHit = true; p1.takeDamage(p2.getDamage(), p2); }
    if (p1.x < p2.x) { p1.facing = 1; p2.facing = -1; } else { p1.facing = -1; p2.facing = 1; }
    const dist = Math.abs(p1.x - p2.x);
    if (dist < 50) { const push = (50-dist)/2; if (p1.x < p2.x) { p1.x -= push; p2.x += push; } else { p1.x += push; p2.x -= push; } }
}

// === UI ===
function updateUI() {
    document.getElementById('p1-health').style.width = p1.health + '%';
    document.getElementById('p2-health').style.width = p2.health + '%';
    document.getElementById('p1-super').style.width = p1.superMeter + '%';
    document.getElementById('p2-super').style.width = p2.superMeter + '%';
    document.getElementById('timer').textContent = timer;
    const c1 = document.getElementById('combo-display-p1'), c2 = document.getElementById('combo-display-p2');
    if (p1.combo > 1) { c1.textContent = p1.combo + ' HIT COMBO!'; c1.style.opacity = '1'; } else c1.style.opacity = '0';
    if (p2.combo > 1) { c2.textContent = p2.combo + ' HIT COMBO!'; c2.style.opacity = '1'; } else c2.style.opacity = '0';
}

function announce(text, duration) {
    const el = document.getElementById('announcement'); el.textContent = text; el.style.opacity = '1';
    setTimeout(() => { el.style.opacity = '0'; }, duration || 2000);
}

// === ROUND MANAGEMENT ===
function checkRoundEnd() {
    if (p1.health <= 0 || p2.health <= 0 || timer <= 0) {
        gameState = 'roundEnd'; clearInterval(timerInterval);
        let winner;
        if (p1.health <= 0) { winner = 'p2'; p2Wins++; }
        else if (p2.health <= 0) { winner = 'p1'; p1Wins++; }
        else { winner = p1.health > p2.health ? 'p1' : 'p2'; if (winner === 'p1') p1Wins++; else p2Wins++; }
        const winnerName = winner === 'p1' ? p1.name : p2.name;
        if (p1Wins >= 2 || p2Wins >= 2) {
            announce(winnerName + ' WINS!', 3000);
            setTimeout(() => { gameState = 'gameOver'; announce('GAME OVER - SPACE TO RESTART', 99999); }, 3000);
        } else {
            announce(winnerName + ' WINS ROUND ' + round, 2000);
            round++; setTimeout(() => startRound(), 3000);
        }
    }
}

function startRound() {
    p1.reset(200); p2.reset(800); timer = 99; particles = [];
    document.getElementById('round-display').textContent = 'ROUND ' + round;
    announce('ROUND ' + round, 1500);
    setTimeout(() => { announce('FIGHT!', 1000); gameState = 'fighting';
        timerInterval = setInterval(() => { if (gameState === 'fighting') { timer--; if (timer <= 0) timer = 0; } }, 1000);
    }, 2000);
}

function startGame() { document.getElementById('start-screen').style.display = 'none'; round = 1; p1Wins = 0; p2Wins = 0; startRound(); }
function resetGame() { document.getElementById('announcement').style.opacity = '0'; round = 1; p1Wins = 0; p2Wins = 0; startRound(); }

// === MAIN GAME LOOP ===
function gameLoop() {
    ctx.save();
    if (screenShake > 0) { ctx.translate(Math.random()*screenShake - screenShake/2, Math.random()*screenShake - screenShake/2); screenShake *= 0.8; if (screenShake < 0.5) screenShake = 0; }
    drawBackground();
    if (gameState === 'fighting' || gameState === 'roundEnd') { handleInput(); handleCombat(); p1.update(); p2.update(); updateParticles(); checkRoundEnd(); }
    p1.draw(); p2.draw(); drawParticles(); updateUI();
    ctx.restore();
    requestAnimationFrame(gameLoop);
}
gameLoop();
