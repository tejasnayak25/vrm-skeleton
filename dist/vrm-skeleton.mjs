import * as THREE from "three";

function includesName(text, queryList) {
    let found = 0;
    for (const item of queryList) {
        if(text.toLowerCase().includes(item)) found = 1;
    }
    return found;
}

export default class VRMSkeleton {
    constructor({vrm, holder, interact = true, interactionManager = null, color="blue", transform_controls = null}) {
        if(interact && (!interactionManager || !transform_controls)) throw new Error("No interaction manager found!");

        this.vrm = vrm;
        this.holder = holder;
        this.bones = [];
        this.selectedBone = null;
        this.transform_controls = transform_controls;
        this.transform_state = transform_controls.mode;

        let skeletonHelper = new THREE.SkeletonHelper(vrm.scene);

        skeletonHelper.bones.forEach(vrmbone => {
            if(vrmbone.name === "Root") return;

            let found = includesName(vrmbone.name, ['thumb', 'index', 'toes', 'eye', 'little', 'ring', 'middle']);
            let shfound = includesName(vrmbone.name, ['hair', 'skirt', 'sleeve']);
            let bust = includesName(vrmbone.name, ['bust']);

            let position = new THREE.Vector3();
            vrmbone.getWorldPosition(position);

            let scaleCorrection = new THREE.Vector3(1, 1, 1);
            position.multiply(scaleCorrection);

            let sphere = new THREE.SphereGeometry(found || shfound || bust ? 0.005 : 0.015);
            let material = new THREE.MeshBasicMaterial({
                color: "grey",
                depthTest: false,
                depthWrite: false,
                transparent: true,
                opacity: 0.65,
                visible: true
                
            });
            let mesh = new THREE.Mesh(sphere, material);
            mesh.position.copy(position);

            this.holder.add(mesh);

            if(vrmbone.children.length === 0) {
                this.bones.push({
                    parent: vrmbone,
                    childbone: null,
                    mesh, 
                    childmesh: null
                });
                return;
            }

            vrmbone.children.forEach(childbone => {
                let childposition = new THREE.Vector3()
                childbone.getWorldPosition(childposition);
    
                let childscaleCorrection = new THREE.Vector3(1, 1, 1);
                childposition.multiply(childscaleCorrection);
    
                // Calculate the direction from the parent bone to the child bone
                let direction = new THREE.Vector3();
                direction.subVectors(childposition, position).normalize();
    
                // Calculate the midpoint between the parent and child bones
                let midpoint = new THREE.Vector3();
                midpoint.addVectors(position, childposition).multiplyScalar(0.5);
    
                // Create a cube geometry that spans the distance between the bones
                let distance = position.distanceTo(childposition);

                let cube = new THREE.CylinderGeometry(0.004, found || shfound || bust ? 0.008 : 0.02, distance);
                cube.rotateX(Math.PI / 2);
    
                // Clone the material and adjust the color
                let cubematerial = material.clone();
                cubematerial.color.set("grey");
    
                // Create the cube mesh
                let childmesh = new THREE.Mesh(cube, cubematerial);
    
                // Set the position of the cube to the midpoint
                childmesh.position.copy(midpoint);
    
                // Align the cube with the direction between the bones
                childmesh.lookAt(childposition);
    
                // Add the cube mesh to the scene
                this.holder.add(childmesh);

                this.bones.push({
                    parent: vrmbone,
                    childbone: childbone,
                    mesh, 
                    childmesh
                });

                if(interact) {
                    interactionManager.add(childmesh);

                    childmesh.addEventListener("mouseover", () => {
                        document.body.style.cursor = "pointer";
                    });

                    childmesh.addEventListener("mouseout", () => {
                        document.body.style.cursor = "auto";
                    });

                    childmesh.addEventListener("click", () => {
                        if(shfound || bust) {
                            transform_controls.mode = "translate";
                        } else {
                            transform_controls.mode = "rotate";
                        }
                        if(this.selectedBone) {
                            this.selectedBone.cubematerial.color.set("grey");
                        }
                        cubematerial.color.set(color);
                        this.selectedBone = {
                            cube, cubematerial, childbone
                        }

                        let bone = shfound || bust ? vrmbone : vrm.scene.getObjectByName(`Normalized_${vrmbone.name}`);
                        transform_controls.attach(bone);
                    });
                }
            });
        });

        holder.visible = false;
    }

    /**
     * @returns { boolean }
     */
    get visible() {
        return this.holder.visible;
    }

    show() {
        this.transform_controls.mode = "rotate";
        this.transform_controls.detach();
        this.holder.visible = true;
    }

    update() {
        this.bones.forEach(bonedata => {
            let bone = bonedata.parent;

            let position = new THREE.Vector3();
            bone.getWorldPosition(position);

            let scaleCorrection = new THREE.Vector3(1, 1, 1);
            position.multiply(scaleCorrection);

            bonedata.mesh.position.copy(position);

            if(bonedata.childbone) {
                let childbone = bonedata.childbone;
                let childmesh = bonedata.childmesh;

                let childposition = new THREE.Vector3()
                childbone.getWorldPosition(childposition);
    
                let childscaleCorrection = new THREE.Vector3(1, 1, 1);
                childposition.multiply(childscaleCorrection);
    
                // Calculate the direction from the parent bone to the child bone
                let direction = new THREE.Vector3();
                direction.subVectors(childposition, position).normalize();
    
                // Calculate the midpoint between the parent and child bones
                let midpoint = new THREE.Vector3();
                midpoint.addVectors(position, childposition).multiplyScalar(0.5);

                childmesh.position.copy(midpoint);
    
                // Align the cube with the direction between the bones
                childmesh.lookAt(childposition);
            }
        });
    }

    hide() {
        this.holder.visible = false;
        this.transform_controls.detach();
        this.transform_controls.mode = this.transform_state;
    }
}