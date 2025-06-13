import { useEffect, useRef } from 'react';
import Phaser from 'phaser';

export default function CastleDefence() {
  const gameRef = useRef(null);

  useEffect(() => {
    if (gameRef.current) return;

    class MainScene extends Phaser.Scene {
      constructor() {
        super('MainScene');
      }

      preload() {}

      create() {
        this.physics.world.setBounds(0, 0, this.scale.width, this.scale.height);

        this.castle = this.add.rectangle(50, this.scale.height / 2, 60, 100, 0x8b4513);
        this.physics.add.existing(this.castle, true);

        this.bullets = this.physics.add.group();
        this.enemies = this.physics.add.group();

        this.castleHealth = 3;
        this.score = 0;

        this.scoreText = this.add.text(10, 10, 'Score: 0', { fontSize: '20px', color: '#ffffff' });
        this.healthText = this.add.text(10, 40, 'Health: 3', { fontSize: '20px', color: '#ffffff' });

        this.gameOverText = this.add
          .text(this.scale.width / 2, this.scale.height / 2 - 40, 'GAME OVER', {
            fontSize: '32px',
            fontFamily: 'monospace',
            backgroundColor: '#000',
            color: '#ff0000',
            padding: { x: 10, y: 5 },
          })
          .setOrigin(0.5)
          .setVisible(false);

        this.startText = this.add
          .text(this.scale.width / 2, this.scale.height / 2, 'START', {
            fontSize: '32px',
            fontFamily: 'monospace',
            backgroundColor: '#000',
            color: '#ffff00',
            padding: { x: 10, y: 5 },
          })
          .setOrigin(0.5)
          .setInteractive();

        this.startText.on('pointerdown', () => this.startGame());

        this.physics.pause();

        this.input.on('pointerdown', (pointer) => {
          if (this.state !== 'PLAYING') return;
          this.shoot(pointer);
        });

        this.physics.add.overlap(this.bullets, this.enemies, this.handleBulletEnemy, undefined, this);
        this.physics.add.overlap(this.enemies, this.castle, this.handleEnemyCastle, undefined, this);
      }

      startGame() {
        this.state = 'PLAYING';
        this.physics.resume();
        this.startText.setVisible(false);
        this.gameOverText.setVisible(false);
        this.castleHealth = 3;
        this.score = 0;
        this.scoreText.setText('Score: 0');
        this.healthText.setText('Health: 3');

        this.spawnTimer = this.time.addEvent({
          delay: 1000,
          callback: this.spawnEnemy,
          callbackScope: this,
          loop: true,
        });
      }

      endGame() {
        this.state = 'GAME_OVER';
        this.physics.pause();
        if (this.spawnTimer) this.spawnTimer.remove(false);
        this.bullets.clear(true, true);
        this.enemies.clear(true, true);
        this.gameOverText.setVisible(true);
        this.startText.setText('RESTART').setVisible(true);
      }

      shoot(pointer) {
        const bullet = this.add.rectangle(this.castle.x + 40, this.castle.y, 10, 4, 0xffff00);
        this.physics.add.existing(bullet);
        bullet.body.setVelocityX(400);
        bullet.body.setAllowGravity(false);
        this.bullets.add(bullet);
      }

      spawnEnemy() {
        const y = Phaser.Math.Between(50, this.scale.height - 50);
        const enemy = this.add.rectangle(this.scale.width + 20, y, 40, 40, 0xff0000);
        this.physics.add.existing(enemy);
        enemy.body.setVelocityX(-100);
        enemy.body.setImmovable(true);
        enemy.body.setAllowGravity(false);
        this.enemies.add(enemy);
      }

      handleBulletEnemy(bullet, enemy) {
        bullet.destroy();
        enemy.destroy();
        this.score += 1;
        this.scoreText.setText(`Score: ${this.score}`);
      }

      handleEnemyCastle(castle, enemy) {
        enemy.destroy();
        this.castleHealth -= 1;
        this.healthText.setText(`Health: ${this.castleHealth}`);
        if (this.castleHealth <= 0) {
          this.endGame();
        }
      }
    }

    gameRef.current = new Phaser.Game({
      type: Phaser.AUTO,
      width: window.innerWidth,
      height: window.innerHeight,
      parent: 'castle-container',
      backgroundColor: '#87ceeb',
      physics: {
        default: 'arcade',
        arcade: {
          gravity: { y: 0 },
          debug: false,
        },
      },
      scene: MainScene,
    });

    const resize = () => {
      const game = gameRef.current;
      game.scale.resize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', resize);

    return () => {
      window.removeEventListener('resize', resize);
      gameRef.current.destroy(true);
      gameRef.current = null;
    };
  }, []);

  return <div id="castle-container" style={{ width: '100vw', height: '100vh' }} />;
}

