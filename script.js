

/**START WEBGL **/
$(window).load(function() {

	// laddar in guit
	initialize_GUI();

	// standard global variables
	var cube2, loader, engine, container, scene, camera, renderer, group, ship, cube, sphere, dt, lookatpoint; //controls;
	var keyboard = new THREEx.KeyboardState();
	var clock = new THREE.Clock();

	// custom global variables
	var jumpClock;
	var jumpTime = 0.0;

	var maxRotX, maxTransX; //skeppets maximala rotation resp. förflyttning
	var jumpAmp; //hur högt skeppet kan hoppa (jumpAmplitude)
	var jumpOrdive; //Dyka eller hoppa.
	var hoverDist; //hur högt över banan som skeppet flyger
	var shipSpeed;
	
	var shipDistZ = 0,
		shipDistStart = 0;

	var PI = Math.PI;

	init();
	animate();

	// FUNCTIONS 		
	function init() 
	{

		'use strict';
		//Initiate Physijs
		Physijs.scripts.worker = 'physics/physijs_worker.js';
		Physijs.scripts.ammo = 'ammo.js';
		// SCENE
		scene = new Physijs.Scene();

		//Group to place all things that's supposed
		//to follow the ship in the z axis, such as camera, lights, skybox(?!), etc
		group = new THREE.Object3D();


		// CAMERA
		var SCREEN_WIDTH = window.innerWidth, 
			SCREEN_HEIGHT = window.innerHeight;
		var VIEW_ANGLE = 45, 
			ASPECT = SCREEN_WIDTH / SCREEN_HEIGHT, 
			NEAR = 1, 
			FAR = 20000;

		camera = new THREE.PerspectiveCamera( VIEW_ANGLE, ASPECT, NEAR, FAR);

		camera.position.set(0,400,1200);
		camera.lookAt(scene.position);
		lookatpoint = new THREE.Object3D();
		

		// RENDERER
		if ( Detector.webgl )
			renderer = new THREE.WebGLRenderer( {antialias:true} );
		else
			renderer = new THREE.CanvasRenderer(); 

		renderer.setSize(SCREEN_WIDTH, SCREEN_HEIGHT);

		renderer.shadowMapEnabled = true;
		renderer.shadowMapSoft = true;// to antialias the shadow
		
		container = document.getElementById( 'WebGL-container' );
		container.appendChild( renderer.domElement );
		
		// EVENTS
		THREEx.WindowResize(renderer, camera);
		THREEx.FullScreen.bindKey({ charCode : 'm'.charCodeAt(0) });
				
		// FLOOR
		var floorTexture = new THREE.ImageUtils.loadTexture( 'texture/motherboard.jpg' );
		floorTexture.wrapS = floorTexture.wrapT = THREE.RepeatWrapping; 
		floorTexture.repeat.set( 1, 1 );
		var floorMaterial = new THREE.MeshLambertMaterial( { color: 0x444444, map: floorTexture, side: THREE.DoubleSide } );
		var floorGeometry = new THREE.PlaneGeometry(300, 2000, 10, 10);
		var floor = new Physijs.BoxMesh(floorGeometry, floorMaterial);
		floor.position.y = -10.5;
		floor.position.z = -950;
		floor.rotation.x = PI / 2;
	
		
		// SKYBOX/FOG
		var skyBoxGeometry  = new THREE.CubeGeometry( 8000, 8000, 30000 );
		var skyBoxMaterial  = new THREE.MeshLambertMaterial( {map:THREE.ImageUtils.loadTexture('texture/space.jpg'), side: THREE.BackSide } );
		var skyBox 			= new THREE.Mesh( skyBoxGeometry, skyBoxMaterial );
		skyBox.position.y = 1500;
	    
	    sphere = new Physijs.SphereMesh(new THREE.SphereGeometry(100, 3200), floorMaterial, 0.2);
		sphere.position.y = 100;
		sphere.position.z = -300;
		sphere.rotation.x=0.5;
		//scene.add(sphere);

		var ambientLight = new THREE.AmbientLight(0xbbbbbb);
	    //scene.add(ambientLight);
	    //Directional light
	    var directionalLight = new THREE.DirectionalLight( 0xffeedd );
	    directionalLight.position.set( 0, 10, 10 ).normalize();
	 
	 	
		

			////////////
			// CUSTOM //
			////////////	
		//////////////////////
		/// Carlbaum edits ///
		//////////////////////

		//kuben som styr fysiken
		cube = new Physijs.BoxMesh(new THREE.CubeGeometry(200,180,180), floorMaterial, 0.9);
		cube.position.y = 80;

		scene.setGravity(new THREE.Vector3( 0, -1800, 0 ));
		//skeppets geometri
		var shipLength 	= 200, shipHeight = 60,	shipWidth = 60,
			wingWidth	= 150, wingHeight = 20, wingDepth = 100;
			
		var shipGeom = new THREE.CubeGeometry(	shipWidth,
												shipHeight,
												shipLength);
		var	wingGeom 	= new THREE.CubeGeometry( wingWidth,
												  wingHeight,
												  wingDepth);
												  
		var shipMat 	= new THREE.MeshLambertMaterial( { color: 0x006464 } );

		ship 			= new THREE.Mesh( shipGeom, shipMat, 0.4);

		var rightWing = new THREE.Mesh( wingGeom, shipMat ),
			leftWing  = new THREE.Mesh( wingGeom, shipMat );
			
		//skeppet övrigt
		maxRotX = PI /3; 	//skeppets maximala lutning
		maxTransX = 625;	
		jumpAmp = 150;
		hoverDist = shipHeight / 2 + 30; //flyger 100units över planet 
		shipSpeed = 200;

		ship.position.y = hoverDist;

		leftWing.position.x = -30;
		leftWing.rotation.y = PI * 1/3.2;

		rightWing.position.x = 30;
		rightWing.rotation.y = -PI * 1/3.2;
		
		//föremåls skugghantering
		ship.castShadow = true;	
		ship.receiveShadow = true;
		
		leftWing.castShadow = true;
		leftWing.receiveShadow = true;
		
		rightWing.castShadow = true;
		rightWing.receiveShadow = true;

		floor.castShadow = false;
		floor.receiveShadow = true;

		// LIGHTS
		//LJUSEN FUCKARRRRRRRRRRRRRRRRRRRRR, måste fixas
		//tror det beror på att positionen som de tittar på måste uppdateras varje frame, eller liknande
		var lightMain	= new THREE.SpotLight(0xffffff), 			//ljus ovan som följer skeppet
			lightFront	= new THREE.SpotLight(0x00ff00),				//framlykta
			lightRear	= new THREE.PointLight(0xff2200, 10.0, 150.0);	//(color, intensity, distance) tanken är att simulera ljus från partiklarna(elden) 
		
		lightMain.position.set( 0, 2000, 0);
		lightMain.target = group;
		lightMain.castShadow = true;
		//lightMain.shadowDarkness = 0.5;
		//inte riktigt säker på vad följande gör men men
		lightMain.shadowMapWidth = 512; //hur många pixlar som skuggan ska bestå av?
		lightMain.shadowMapHeight = 512; // -||-
		lightMain.shadowCameraNear = 500; //skuggor som är närmare ljuskällan renderas inte?
		lightMain.shadowCameraFar = 3000; //skuggor som är längre ifrån ljuskällan renderas inte?
		lightMain.shadowCameraFov = 30;	  //FieldOfView? ändrar i princip skärpan på skuggan, högre = sämre men mer 'falloff' 	
		
		var aim = new THREE.Object3D();	
		aim.position.z = -200;
		lightFront.angle = PI/9;
		lightFront.position.set( 0, 0, -shipLength/2-15);
		lightFront.target = aim;
		lightFront.exponent = 0;
		//lightFront.target = new THREE.Vector3(0,0,ship.position.z -200);
		//lightFront.castShadow = true; 
		//lightFront.intensity = 1.0;
		/*lightFront.shadowMapWidth = 1024; 
		lightFront.shadowMapHeight = 1024; 
		lightFront.shadowCameraNear = 500; 
		lightFront.shadowCameraFar = 4000; 
		lightFront.shadowCameraFov = 30; 

		lightRear.position.set( 0, shipHeight/2-10, shipLength/2+20);
	/*	lightRear.intensity = 10.0;
		lightRear.distance = 100;
	*/
		//skapa partikelsystem
		engine = new ParticleEngine();
		engine.setValues( Examples.carlbaum );
		engine.initialize(); // jag tog bort scene.add från ParticleEngine.js för att kunna använda ship.add istället
		engine.positionBase.z = shipLength/2;

		//laddar in modell
		/*loader = new THREE.OBJMTLLoader();
		loader.load( 'objects/Wraith_Raider_Starship.obj', 'objects/Wraith_Raider_Starship.mtl', function ( object ) {
			//Object is the car, adding car to the cube for physics
			object.scale.set(0.6,0.6,0.6);
			object.rotation.y = Math.PI;
			object.position.y = -100/2;

			//ship.add(object);

		} );
*/
		//för modell
		
		ship.visible = true;
		rightWing.visible = true;
		leftWing.visible = true;
		cube.visible = false;

		//lägg till objekt i scenen/gruppen etc
		cube.add(skyBox);
		camera.add(skyBox);
		//scene.add(skyBox);
		scene.add(camera);
		//cube.add(camera);

		scene.add(cube);
		scene.add(floor);
		scene.add( directionalLight );

		ship.add( leftWing );
		ship.add( rightWing );
		ship.add( aim );
		ship.add( lightFront );
		ship.add( lightRear );	
		ship.add( engine.particleMesh );

		

		group.add(lightMain);
		cube.add(group);
		cube.add(ship);

	}

	function animate() 
	{
	    var requestId = requestAnimationFrame( animate );

	    // för att den endast ska åka i sidled 
	    cube.lookAt(new THREE.Vector3( 0, 0, 1500 ) );
	    
	    camera.position.z = cube.position.z + 900;
		lookatpoint.position.z = cube.position.z;
		camera.lookAt(lookatpoint.position);

		render();		
		update();

		checkRotation();



		// här dör man
		if(cube.position.y < -100)
			endGame(requestId);
		

		scene.simulate();
	}

	function checkRotation(){
		
		var rotSpeed = 0.02;

	    var x = camera.position.x,
	        y = camera.position.y,
	        z = camera.position.z;

	    if (keyboard.pressed("Z")){ 
	        camera.position.x = x * Math.cos(rotSpeed) + z * Math.sin(rotSpeed);
	        camera.position.z = z * Math.cos(rotSpeed) - x * Math.sin(rotSpeed);
	    } else if (keyboard.pressed("X")){
	        camera.position.x = x * Math.cos(rotSpeed) - z * Math.sin(rotSpeed);
	        camera.position.z = z * Math.cos(rotSpeed) + x * Math.sin(rotSpeed);
	    }if (keyboard.pressed("G")){ 
	        camera.position.y = y * Math.cos(rotSpeed) + z * Math.sin(rotSpeed);
	        camera.position.z = z * Math.cos(rotSpeed) - y * Math.sin(rotSpeed);
	    } else if (keyboard.pressed("B")){
	        camera.position.y = x * Math.cos(rotSpeed) - y * Math.sin(rotSpeed);
	        camera.position.z = z * Math.cos(rotSpeed) + y * Math.sin(rotSpeed);
	    }

	    camera.lookAt(scene.position);

	}

	function update()
	{	
		// för att styra skeppet
		shipControls();

		//ger sekunder sen senaste 
		dt = clock.getDelta();
		console.log(dt);

		engine.update( dt * 0.8 );	//uppdatera particles

		//generera ett vägsegment 
		shipDistZ = cube.position.z;

		if ( shipDistZ-shipDistStart <= -500 ) {
			scene.add( generateGroundSegment() );
			shipDistStart = cube.position.z;
		}

	}


	function shipControls(){

		var jumpvec = new THREE.Vector3( 0, 700, 0 );
		var rightvec = new THREE.Vector3( 20, 0, 0 );
		var leftvec = new THREE.Vector3( -20, 0, 0 );
		var toscreenvec = new THREE.Vector3( 0, 0, 20 );
		var awayscreenvec = new THREE.Vector3( 0, 0, -20);

		//the sphere control
	/*
		if ( keyboard.pressed("left") ) {
			sphere.applyCentralImpulse(leftvec);
			console.log("hej");
		}

		if ( keyboard.pressed("right") ) 
			sphere.applyCentralImpulse(rightvec);

		if ( keyboard.pressed("down") ) 
			sphere.applyCentralImpulse(toscreenvec);
			
		if ( keyboard.pressed("up") ) 
			sphere.applyCentralImpulse(awayscreenvec);
	*/

		if ( keyboard.pressed("W") ) {
			cube.applyCentralImpulse(awayscreenvec);
			engine.positionStyle = Type.SPHERE;
		}

		//liten eld då man inte gasar
		else
			engine.positionStyle = Type.CUBE;
		

		if ( keyboard.pressed("S") ) 
			cube.applyCentralImpulse(toscreenvec);

		//skeppets lutning
		if ( keyboard.pressed("D") ||  keyboard.pressed("A") ) {
			if ( keyboard.pressed("D") &&   keyboard.pressed("A") ) { //om båda knapparna hålls in -> räknas som dem är släppta
				stabilizeShip(dt, ship.rotation.z, 1.0);
			}

			else if ( keyboard.pressed("D") ) {
						
				if ( ship.position.x >= maxTransX -200) { 	//om skeppet närmar sig maxTransX, stabilisera
					ship.rotation.z = stabilizeShip(dt, ship.rotation.z, 5.0);
				}
				else{
					ship.rotation.z -= dt * PI * 2/3;
					cube.applyCentralImpulse(rightvec);
				}
				if(ship.rotation.z < -maxRotX)			
					ship.rotation.z = -maxRotX;
			}

			else if ( keyboard.pressed("A") ) {
				if ( ship.position.x <= -maxTransX +200) {
					ship.rotation.z = stabilizeShip(dt, ship.rotation.z, 5.0);
				}
				else{
					ship.rotation.z += dt * PI * 2/3;
					cube.applyCentralImpulse(leftvec);
				}
				if(ship.rotation.z > maxRotX ) {
					ship.rotation.z = maxRotX ;
				}	
			}
		}

		else if (ship.rotation.z != 0 ){
			ship.rotation.z = stabilizeShip( dt, ship.rotation.z ,1.0);
		}
		
		//console.log(ship.rotation.z);
		//skeppets x-position styrs av lutningen
		//ship.position.x -= ship.rotation.z*50;

/*		Används antagnligen inte.... finns ingen ship position

		if ( Math.abs(ship.position.x) >= maxTransX ) {
			ship.position.x = ship.position.x/Math.abs(ship.position.x) * maxTransX;
		}
*/

		if (jumpTime != 0.0 ) { //if a jump is in progress
			if (jumpClock.getElapsedTime() >= 1.0) { //if jump completed, end jump and reset variables to default values
				jumpClock.stop();
				jumpTime=0.0;
				ship.position.y = hoverDist;
				ship.rotation.x = 0;
			}
			else { //if the jump is still in progress
				jumpTime = jumpClock.getElapsedTime();

				ship.position.y = jumpOrdive * jumpAmp * Math.sin( 1 * PI* jumpTime) + hoverDist;


				// att göra: minska kubens höjd vid dyk
				if(jumpOrdive < 0){
					ship.rotation.x = -jumpOrdive * PI/16 *Math.sin( 2 * PI *jumpTime);
				}
				// rotation för hopp
				else
					ship.rotation.x = PI/16 *Math.sin( 2 * PI *jumpTime);
			}
		}
		else if ( keyboard.pressed("space") ) { //if jump is not in progress and user hits space
			cube.applyCentralImpulse(jumpvec);

			// 0 för den ska endast hänga efter kuben
			jumpOrdive = 0;
			jump(); //starts jump timer
		}
		else if(keyboard.pressed("shift") ) {
			jumpOrdive = -0.8;
			jump();
		}

	}

	//stabiliserar skeppet.. 
	//dt = delta time, 
	//axis = axel som ska stabiliseras, 
	//factor bestämmer hur snabbt det ska stabiliseras
	function stabilizeShip(dt,axis,factor)
	{
		if(axis < 0 ) {
			axis -= dt * PI * axis * factor;
		}
		else if (axis > 0 )
			axis -= dt * PI * axis * factor;		
		else
			axis = 0 ;
		return axis;
	}

	function jump() //starts a new jump timer
	{
		jumpClock = new THREE.Clock();
		jumpClock.start();
		jumpTime = jumpClock.getElapsedTime();
	}

	function render() 
	{
		renderer.render( scene, camera );
	}	


	//ground generating function
	//variables
	var laneWidth = 300,		//bredd på varje vägfil
		minSegmentLength = 1800, //minsta längden på ett vägsegment
		laneOverlap = 1000;
		
	var	groundPosY = -10.5,
		groundPosZ = 1950,		//uppdateras efter varje nytt segment, defaultvärdet ska vara lika med startplanets sista z-koordinat
		prevGroundLane = 0;		// -1 = vänster lane, 0 = mitten, 1 = höger lane
		
	var	obstaclePosZ =500;
		
	var groundTexture = new THREE.ImageUtils.loadTexture( 'texture/motherboard.jpg' );
		groundTexture.wrapS = groundTexture.wrapT = THREE.RepeatWrapping; 
		groundTexture.repeat.set( 1, 1 );
	var groundMaterial = new THREE.MeshLambertMaterial( { color: 0x444444, map: groundTexture, side: THREE.DoubleSide } );
	var groundGeometry;
	var obstacleGeometry;

	
	function generateGroundSegment() //generates a ground segment
	{
		//console.log("generera mark");
		var segLength = Math.floor((Math.random()*1000)+minSegmentLength);			//den faktiska längden på det segment som genereras
		groundGeometry = new THREE.PlaneGeometry(laneWidth, segLength); 	//antalet segment är 1 default, tog bort 2 sista parametrarna..Lagg?
		obstacleGeometry = new THREE.PlaneGeometry(laneWidth, hoverDist);
		var ground = new Physijs.BoxMesh(groundGeometry, groundMaterial);	
		var obstacle = new Physijs.BoxMesh(obstacleGeometry, groundMaterial); //hinder i banan, genereras på planet	
		
		var newGroundLane = Math.floor((Math.random()*3)-1); //randomgrejen genererar -1, 0 eller 1 ( alltså vilken lane som ground ska hamna i)
		ground.rotation.x = PI / 2;

		if( newGroundLane == prevGroundLane ) {
			ground.position.z = -groundPosZ - segLength/2;
			obstacle.position.z = -groundPosZ - segLength/2;
			groundPosZ += segLength;			// öka på för att nästa segment ska hamna på korrekt plats


		}
		else {
			ground.position.z = -groundPosZ - segLength/2 + laneOverlap;
			groundPosZ += segLength -600 ;			// öka på för att nästa segment ska hamna på korrekt plats
		}

		ground.position.x = laneWidth * newGroundLane;
		prevGroundLane = newGroundLane;	

		obstacle.position.y = hoverDist/2;
		obstacle.position.x = laneWidth * newGroundLane;
		scene.add(obstacle)	;
		
		return ground;
	}	
	///MÅSTE!!! MÅSTE lägga till removeGroundSegment() ( tror jag.. )
	function removeGroundSegment() 
	{
		/* 
			typ hitta alla groundSegments med z-värden större än (skeppets z-värde + offset(typ 400))
			och deleta dem.. annars kanske dem tar upp en massa onödigt minne
		*/
	}

});
