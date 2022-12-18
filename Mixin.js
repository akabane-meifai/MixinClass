class Mixin{
	constructor(...args){
		this.si = [];
		for(let sc of this.constructor.sc){
			if(Array.isArray(sc)){
				let a = sc.slice(1).map(i => args[i]);
				this.si.push(new sc[0](...a));
			}else{
				this.si.push(new sc());
			}
		}
	}
	static proxy = Symbol("proxy");
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
				for(let si of target.si){
					if(prop in si){
						return (typeof si[prop] === "function") ? si[prop].bind(si) : si[prop];
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
		for(let i = mixin.si.length - 1; i >= 0; i--){
			 mixin.si[i][this.proxy] = proxy;
		}
		return proxy;
	}
}
