class Mixin{
	constructor(...args){
		this.si = [];
		this.funcs = {};
		this.gets = {};
		this.sets = {};
		this.container = {};
		const af = Object.getPrototypeOf(async function(){});
		const ag = Object.getPrototypeOf(async function*(){});
		for(let sc of this.constructor.sc){
			let c = sc;
			let i;
			if(Array.isArray(sc)){
				c = sc[0];
				let a = sc.slice(1).map(i => args[i]);
				this.si.push(i = new c(...a));
			}else{
				this.si.push(i = new sc());
			}
			const p = Object.getPrototypeOf(i);
			let props = {funcs: [], gets: [], sets: []};
			for(let ref = c.prototype; ref.constructor !== Object; ref = Reflect.getPrototypeOf(ref)){
				props = Reflect.ownKeys(ref).reduce((a, p) => {
					let pd = Object.getOwnPropertyDescriptor(ref, p);
					let hd = false;
					if("get" in pd){
						hd = true;
						if(typeof pd.get === "function" && !(a.gets.includes(p))){
							a.gets.push(p);
						}
					}
					if("set" in pd){
						hd = true;
						if(typeof pd.set === "function" && !(a.sets.includes(p))){
							a.sets.push(p);
						}
					}
					if(hd){
						return a;
					}
					if((p != "constructor") && (typeof ref[p] === "function") && !(a.funcs.includes(p))){
						a.funcs.push(p);
					}
					return a;
				}, props);
			}
			for(let prop of props.funcs){
				if(!(prop in this.funcs)){
					this.funcs[prop] = new Proxy(function(){}, {
						apply: function(target, thisArg, argumentsList){
							let res = void(0);
							for(let item of target.chain){
								let it = (target.receiver == thisArg) ? item.instance : thisArg;
								if(res !== void(0)){
									it[Mixin.relay] = res;
								}
								if(item.async){
									item.func.apply(it, argumentsList);
								}else{
									res = item.func.apply(it, argumentsList);
								}
								delete it[Mixin.relay];
							}
							return res;
						}
					});
					this.funcs[prop].chain = [];
				}
				this.funcs[prop].chain.push({func: c.prototype[prop], instance: i, async: (p === af) || (p === ag)});
			}
			for(let prop of props.gets){
				if(!(prop in this.gets)){
					this.gets[prop] = [];
				}
				this.gets[prop].push(i);
			}
			for(let prop of props.sets){
				if(!(prop in this.sets)){
					this.sets[prop] = [];
				}
				this.sets[prop].push(i);
			}
		}
	}
	static proxy = Symbol("proxy");
	static relay = Symbol("relay");
	static init = Symbol("init");
	static attach(...classes){
		return class extends this{
			static sc = classes;
			static attach(...classes){
				this.sc = this.sc.concat(classes);
				return this;
			}
		}
	};
	static newInstance(...args){
		const mixin = new this(...args);
		const proxy = new Proxy(mixin, {
			get(target, prop, receiver){
				if(prop in target.funcs){
					return Object.assign(target.funcs[prop], {receiver: receiver});
				}
				if(prop in target.gets){
					let res = void(0);
					for(let it of target.gets[prop]){
						if(res !== void(0)){
							it[Mixin.relay] = res;
						}
						res = it[prop];
						delete it[Mixin.relay];
					}
					return res;
				}
				for(let si of target.si){
					if(prop in si){
						return si[prop];
					}
				}
				return target.container[prop];
			},
			set(target, prop, value, receiver){
				if(prop in target.sets){
					let prev = void(0);
					for(let it of target.sets[prop]){
						if(prev !== void(0)){
							it[Mixin.relay] = prev;
						}
						it[prop] = value;
						delete it[Mixin.relay];
						prev = it;
					}
					return true;
				}
				target.container[prop] = value;
				return true;
			},
			has(target, key){
				for(let si of target.si){
					if(key in si){
						return true;
					}
				}
				return prop in target.container;
			}
		});
		let init = [];
		for(let i = mixin.si.length - 1; i >= 0; i--){
			 mixin.si[i][this.proxy] = proxy;
			 if(this.init in mixin.si[i]){
			 	init.push({func: mixin.si[i][this.init], instance: mixin.si[i]});
			 }
		}
		while(init.length > 0){
			const p = init.pop();
			p.func.apply(p.instance);
		}
		return proxy;
	}
}
