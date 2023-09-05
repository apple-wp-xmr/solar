class SuperHero {
    constructor(name) {
        this._name = name;
        this._powers = 'none';
    }

    get name() {
        return this._name;
    }

    set name(newName) {
        this._name = newName;
    }

    get powers() {
        return this._powers;
    }

    set powers(newPowers) {
        this._powers = newPowers;
    }
}

module.exports = SuperHero;
