class Mixin{
	constructor(...args){
		this.si = [];
		this.funcs = {};
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
			const props = Reflect.ownKeys(c.prototype).filter(p => (p != "constructor") && (typeof c.prototype[p] === "function"));
			for(let prop of props){
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
				for(let si of target.si){
					if(prop in si){
						return si[prop];
					}
				}
			},
			has(target, key){
				for(let si of target.si){
					if(key in si){
						return true;
					}
				}
				return false;
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
