DEFAULT_COMBINATORS = `S x y z = x z (y z)
K x y = x
I x = x
B x y z = x (y z)
C x y z = x z y
W x y = x y y`

class App {
    constructor(args) {
        this.args = args
    }

    toString() {
        const args = this.args.map(arg => {
            if (arg instanceof App)
                return `(${arg.toString()})`
            else
                return `${arg.toString()}`
        })
        return args.join(" ")
    }

    eq(other) {
        if (!(other instanceof App)) return false
        if (this.args.length != other.args.length) return false
        for (let i = 0; i < this.args.length; i++)
            if (!this.args[i].eq(other.args[i])) return false
        return true
    }
}

class Var {
    constructor(name) {
        this.name = name
    }

    toString() {
        return this.name
    }

    eq(other) {
        return (other instanceof Var && this.name === other.name)
    }
}

class Combinator {
    constructor(name, variables, expr) {
        this.name = name
        this.variables = variables
        this.expr = expr
    }

    toString() {
        const varStr = this.variables.join(" ")
        return `${this.name} ${varStr} = ${this.expr}`
    }
}



const NAME_REGEX = /^[a-zA-Z][0-9_']*/
function parseName(str) {
    return str.match(NAME_REGEX)[0]
}

function parseDef(str) {
    const names = []
    while (str.length > 0) {
        const name = parseName(str)
        str = str.slice(name.length)
        names.push(name)
    }
    return names
}

function parseExpr(str) {
    str = str.replace(/\s/g,"")
    const stack = []
    while (str.length > 0) {
        if (str[0] == "(") {
            stack.push("(")
            str = str.slice(1)
        } else if (str[0] == ")") {
            const parts = []
            while (true) {
                const top = stack.pop()
                if (top == "(") break;
                parts.push(top)
            }
            str = str.slice(1)
            parts.reverse()
            if (parts.length == 1)
                stack.push(parts[0])
            else
                stack.push(new App(parts))
        } else {
            const name = parseName(str)
            str = str.slice(name.length)
            stack.push(new Var(name))
        }
    }

    if (stack.length == 1)
        return stack[0]
    else
        return new App(stack)
}

function parseExpressions(str) {
    return str.split("\n").filter(line => line).map(line => parseExpr(line))
}

function parseCombinator(line) {
    const parts = line.split("=")
    const [name, ...variables] = parseDef(parts[0])
    const expr = parseExpr(parts[1])
    return new Combinator(name, variables, expr)
}

function parseCombinators(combinatorsText) {
    const lines = combinatorsText.split("\n").filter(line => line)
    const combinators = new Map()
    for (const line of lines) {
        const combinator = parseCombinator(line.replace(/\s/g, ""))
        combinators.set(combinator.name, combinator)
    }
    return combinators
}

function reduceOnce(expr, combinators) {
    if (expr instanceof Var) 
        return expr
    else if (expr instanceof App) {
        const [head, ...tail] = expr.args.map(arg => reduceOnce(arg, combinators))    
        if (head instanceof Var && combinators.has(head.name)) {
            const combinator = combinators.get(head.name)
            if (tail.length >= combinator.variables.length) {
                const args = tail.slice(0, combinator.variables.length)
                const left = tail.slice(combinator.variables.length)
                const subst = new Map();
                for (let i = 0; i < combinator.variables.length; i++) {
                    subst.set(combinator.variables[i], args[i])
                }
                const substResult = substitute(combinator.expr, subst)
                if (left.length == 0)
                    return substResult
                else
                    return new App([substResult, ...left])
            }
        }
    }
    return expr
}

function reduce(expr, combinators) {
    while (true) {
        let next = flatten(expr)
        next = reduceOnce(next, combinators)
        if (next.eq(expr)) return expr
        else expr = next
    }
}

function flatten(expr) {
    if (expr instanceof Var)
        return expr;
    else if (expr instanceof App) {
        const [head, ...tail] = expr.args.map(arg => flatten(arg))
        if (head instanceof App)
            return new App([...head.args, ...tail])
        else
            return new App([head, ...tail])
    }
}


function substitute(expr, subst) {
    if (expr instanceof Var) {
        if (subst.has(expr.name))
            return subst.get(expr.name)
        else
            return expr
    }

    if (expr instanceof App) {
        return new App(expr.args.map(arg => substitute(arg, subst)))
    }
}

const combinatorsInput = document.getElementById("combinators-input")
if (!combinatorsInput.value) combinatorsInput.value = DEFAULT_COMBINATORS
const exprInput = document.getElementById("expr-input")

function run() {

    const combinators = parseCombinators(combinatorsInput.value)
    const expressions = parseExpressions(exprInput.value)
    const reduced = expressions.map(expr => reduce(expr, combinators))

    document.getElementById("eval-result").value = reduced.map(expr => expr.toString()).join("\n")
}

document.getElementById("eval-btn").addEventListener("click", run)