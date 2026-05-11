
This game (as of 2/26/25) is being made on **Godot 4.5.1** as a 2D game.

### Game Overviews:
#### **2/25/26**: 
Termibase as of now is a **vampire survivors + oxygen not included + don't starve + binding of Isaac + risk of rain type game** where the player scavenges a world. The player is dropped into said world with a small amount of coins which can be used to build their base. 

A base consists of many different types of buildings:
1) **Suppliers**: These buildings simply supply voltage or some means of operating buildings
2) **Machines**:
	1) **Defensive**: These buildings are used to defend against the enemies
	2) **Supportive**: These buildings help the player in a way other than killing enemies
Buildings can be connected with **wires**. Each machine has a set **current limit** and each supplier can generate a certain amount of voltage. Using Ohm'**s Law (R = V/I),** the player is to calculate the right type of wire for the machine to operate properly. There is however an **overdrive mechanic**. The player can let in more current than the machine can handle to overdrive it, allowing it to work faster at the cost of steady building health cost. A huge part of the game is the **terminal**. The terminal can be opened and **commands can be inputted**. Commands are used to build buildings and remove buildings as well as enter wiring mode. **Coordinate mode** can be used to see the coordinate grid in the world and copy coordinates as well so you can easily paste in the terminal. Use the "help()" command for information on commands. The buildings are implemented in a modular way with each building having their own resource file. 

The main gameplay loop involves some sort of core in the center. Enemies will randomly target either the player or the  core adding enemy complexity. If either the core or the player dies, the game is over.

Gameplay Loop: Build --> Survive Wave --> Scavenge --> Build --> Survive Wave --> Scavenge
1) **Build**: In this period you develop your defenses
2) **Survive**: In this period you are to survive the horde of enemies. The option of going out is possible but building management is also crucial
3) **Scavenge**: In this period there will be lingering enemies outside and you can scavenge for
	1) Blueprints: To unlock new building blueprints
	2) Resources: To craft said buildings

### Logs:
#### Log #1 (2/25/26):
The first log is a bit delayed but here is what has been implemented:
1) Player movement with rough sprite + animations
	-  WASD top down movement
	-  ![[PlayerModel_Idle.png]]
2) Enemy Logic (only targets the player)
	-  Using Nav Mesh, simply moves towards player and can deal damage
3) Coin Generator building + Basic Sprite
	-  Generates coins when powered
	- ![[CoinGen.png|16]]
4) Turret building + Basic Sprite + Muzzle Flash
	-  Targets closest enemy
	-  ![[Turret Base.png]]![[Turret Gun.png]]
5) Basic Battery + Basic Sprite
	-  Generates voltage and drains proportional to connections
	-  ![[BasicBattery.png]]
	1) Basic Test Tile map
	-  ![[ExportedLayers.png]]
7) Health Bar
8) Wire Mode + Wire Functionality
	-  Different wire with different resistance types
9) Terminal Window
	-  Can be opened with tab and can be moves around the screen. Clicking out of terminal removes focus from it, allowing control of the player.
10) Command Parser
11) Coordinate View + Coordinate Copier
	-  Press c to open coordinate mode. In order to copy coordinates, one can click on the coordinate square.
12) Various other scripts and additions (To make everything clean, organized and modular)
	-  Building Managers + Resource files
	-  Game State Manager SIngleton
This log was more so dedicated to getting the game up and running. As of now I will build on the gameplay itself and try to tackle game design/logistics problems as well as quality of life

#### Log #2 (3/04/26):
A lot of changes were made coming to this Log. Firstly, the basic enemy sprite was made along side tile map art for World 1. World 1 is to follow a crimson like theme. I also created visual feedback for the coin generator by making a coin generated animation and it was implemented
1) Enemy Sprites
	![[EnemyModelIdle.png]]
2) World 1 Tile set
	- Initial World 1 Tile set A
		![[World1Tileset.png]]
	- World 1 Rev.1
		![[World1TilesetRevamp.png]]
	- World 1 Rev.2
		![[World1TilesetRev2.png]]
3) Coin Generated Animation
	- ![[CoinGenerated.png]]

Another big change that was made is a complete overhaul to the building mechanic and terminal itself:
4) Terminal: The terminal UI was completely changed; its no longer a moveable window and instead appears at the bottom of the screen scaling the screen width when clicking tab. The focus modes were also removed. Now, when the terminal is opened, the player cannot move until the terminal is closed with tab again.
5) Building Mechanic: Building was changed and buildings are no longer built with commands. Now, buildings can be built via a Build Mode (which is accessed by terminal commands) and it is very similar to Wire Mode

One big addition I added was the main, rough gameplay loop. I implemented the build --> horde --> scavenge loop. For the build phase your only task is to setup an initial building setup with your starting coins. This phase lasts for 30 seconds. Next. the horde phase comes where a wave of enemies (where the enemy quantity scales with your time survived) comes to attack you and your base. Enemies are randomly chosen to target the player, or buildings. After you kill off all the horde, the scavenge phase begins which hasn't yet been implemented

6) Gameplay Loop:
	- Build Phase
	- Horde Phase
	- Rough Scavenge Phase
7) Multi-targeting Enemy AI

Lastly, I configured Y-sort to work such that sprites appear behind or in front of others accordingly to show depth.

#### Log #3 (4/2/26):
During this log, not much progress was made due to school ramping up and other errands. Firstly, **scavenge** mode was fully implemented. During scavenge mode, some enemies spawn and items spawn around the map. You as the player can go around and collect these items.
- Battery recharge pack:
	![[BatteryPickup 1.png]]
- Impulse grenade done
	![[ImpulseGrenade 2.png|16]]
	The impulse grenade can be thrown at your cursor. Upon detonation, it impulses enemies back
	
I've additionally, added an inventory command to see your inventory which updates with your items

Some other additions include a battery pulsing function that happens when the battery is powering something and also batteries are now destroyed when they lose charge.

For quality of life I also added prices and your coins when you enter build mode. I also made wires only visible during wire mode

#### Log #4 (5/6/26):
I decided to end development on the game. I fixed up the UI and added a game over screen and the goal is to get as far as possible with the waves.
### Tasks:
- [ ] Shield Generator Building + Basic Sprite ➕ 2026-02-26
- [x] Wires only visible in wire mode ➕ 2026-02-26 ✅ 2026-03-14
- [ ] Setup healing items (that will later be scavenged for)➕ 2026-02-26 
- [x] Basic enemy sprites + animation ➕ 2026-02-26 ✅ 2026-02-26
- [x] Gameplay Test Map with new tiles (Toss in music too) ➕ 2026-02-26 ✅ 2026-03-05
	- [x] New Tileset ➕ 2026-02-26 🛫 🔺 ✅ 2026-02-26
	- [x] Added Music ➕ 2026-02-26 ✅ 2026-02-26
		- [ ] Make Map specific Music➕ 2026-02-26 
			- [ ] Build Mode Music➕ 2026-03-02 
			- [ ] Scavenge Music ➕ 2026-03-02 
			- [ ] Horde Music➕ 2026-03-02 
	- [x] Gameplay Loop ➕ 2026-02-26 ✅ 2026-03-04
- [x] Enemy Spawn functionality ➕ 2026-02-26 ✅ 2026-03-04
- [ ] Basic Menu (Play, Quit, Tutorial, Options)➕ 2026-02-26 
- [ ] Player Death Functionality + Game Over Screen➕ 2026-02-26 
- [x] Enemies target buildings AND player ➕ 2026-02-26 ✅ 2026-03-05
- [ ] Smarter Enemy AI (navigate around buildings IF targetting player) ➕ 2026-02-26 
- [ ] Visual Feed Back➕ 2026-02-26 
	- [ ] Player Hit➕ 2026-02-26 
	- [ ] Enemy Hit➕ 2026-02-26 
	- [ ] Enemy Die➕ 2026-02-26 
	- [ ] Player Die➕ 2026-02-26 
	- [ ] Build Building➕ 2026-02-26 
	- [ ] Destroy Building➕ 2026-02-26 
	- [ ] Copy Coordinate➕ 2026-02-26 
	- [x] Coin Generator generating coins ➕ 2026-02-26 ✅ 2026-03-03
	- [x] Battery Powering machines ➕ 2026-02-26 ✅ 2026-03-14
- [ ] Building Animations➕ 2026-02-26 
	- [x] Coin Generator Idle + Coin Generated ➕ 2026-02-26 ✅ 2026-03-05
	- [ ] Shield Generator Powered➕ 2026-02-26 
- [ ] Fix Building Popups ➕ 2026-02-26 
- [ ] Player Sprite Shadow + Enemy Shadow + Building Shadow➕ 2026-02-26 
	- See if I can program this/put this in game rather than sprite
- [x] Battery Packs to scavenge for in order to re charge battery ➕ 2026-02-26 ✅ 2026-03-11
	- [x] Battery Recharge Mechanic ➕ 2026-02-26 ✅ 2026-03-11
- [ ] Hunger Meter + Food you have to get while scavenging➕ 2026-03-04 
- [x] Overhaul Terminal System ➕ 2026-03-04 ✅ 2026-03-04
- [x] Depth Sorting ➕ 2026-03-04 ✅ 2026-03-04
- [ ] Building Health Packs in Scavenge Mode➕ 2026-03-05 
- [ ] Basic Building Powerup that makes an impulse blast every couple of seconds to knock back enemies ➕ 2026-03-05
	- Obtainment TBD
- [x] Impulse Grenades + Sprite ➕ 2026-03-06 ✅ 2026-03-14
	- Make the player start with 5 impulse grenades. They have to collect more in scavenge  mode
- [ ] Fix enemy AI to navigate around buildings ➕ 2026-03-07 
	- Potential ideas: make the enemies create new PATHS every few seconds
- [ ] Battery Pack Distributor Building (fill w battery recharge packs and it automatically fills batteries when connected)➕ 2026-03-11 
- [x] Inventory + Command ➕ 2026-03-11 ✅ 2026-03-11
- [x] Destroy battery AND wires upon battery discharge ➕ 2026-03-11 ✅ 2026-03-14
	- Potentially just scale the battery slightly up and down
- [ ] Graphics Overhaul➕ 2026-03-14 
- [ ] Procedurally Generated Map➕ 2026-03-14 
- [x] Build Mode pricing and coin showing ➕ 2026-03-14 ✅ 2026-03-14



