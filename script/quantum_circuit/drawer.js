class QuantumCircuitDrawerBase {
    constructor(tag, circuit_dict) {
        this.circuit_dict = circuit_dict;
        this.tag = tag;

        this.sanitize_circuit();
        this.set_constant();
        this.adjust();
        this.init_application()
    }
    sanitize_circuit() {
        for (let operation of this.circuit_dict.operations) {
            if (!("name" in operation)) {
                operation.name = ""
            }
            if (!("color_fill" in operation)) {
                operation.color_fill = null;
            }
            if (!("color_stroke" in operation)) {
                operation.color_stroke = null;
            }
            if (!("qubit_name" in operation)) {
                operation.qubit_name = {}
            }
            if (!("register_name" in operation)) {
                operation.register_name = {}
            }
            if (!("target" in operation)) {
                operation.target = []
            }
            if (!("measurement" in operation)) {
                operation.measurement = false;
            }
            if (!("classical" in operation)) {
                operation.classical = false;
            }
            if (!("control" in operation)) {
                operation.control = []
            }
            if (!("control_neg" in operation)) {
                operation.control_neg = []
            }
            if (!("outcome" in operation)) {
                operation.outcome = []
            }
            if (!("condition" in operation)) {
                operation.condition = []
            }
            const qubit_connect_list = ([0]).concat(operation.target).concat(operation.control).concat(operation.control_neg);
            operation.max_qubit_index = Math.max.apply(Math, qubit_connect_list);
            operation.min_qubit_index = Math.min.apply(Math, qubit_connect_list);
            const register_connect_list = ([]).concat(operation.condition).concat(operation.outcome)
            if (register_connect_list.length == 0) {
                operation.max_register_index = -1;
                operation.min_register_index = -1;
            } else {
                operation.max_register_index = Math.max.apply(Math, register_connect_list);
                operation.min_register_index = Math.min.apply(Math, register_connect_list);
            }
        }
        if (!("qubit_name" in this.circuit_dict)) {
            this.circuit_dict.qubit_name = {};
        }
        if (!("register_name" in this.circuit_dict)) {
            this.circuit_dict.register_name = {};
        }
        if (!("output_name" in this.circuit_dict)) {
            this.circuit_dict.output_name = {};
        }
        if (!("num_qubit" in this.circuit_dict)) {
            let max_qubit_index = 0;
            for (let operation of this.circuit_dict.operations) {
                if (!operation.classical) {
                    max_qubit_index = Math.max(max_qubit_index, operation.max_qubit_index)
                }
            }
            this.circuit_dict.num_qubit = max_qubit_index + 1;
        }
        this.num_qubit = this.circuit_dict.num_qubit;
        if (!("num_register" in this.circuit_dict)) {
            let max_register_index = -1;
            for (let operation of this.circuit_dict.operations) {
                max_register_index = Math.max(max_register_index, operation.max_register_index)
            }
            this.circuit_dict.num_register = max_register_index + 1;
        }
        this.num_register = this.circuit_dict.num_register;
        for (let operation of this.circuit_dict.operations) {
            operation.type = this.check_operation_type(operation);
        }
    }
    set_constant() {
        this.x_step = 60;
        this.y_step = 60;
        this.x_padding = this.x_step * 0.7;
        this.y_padding = this.y_step * 0.7;
        this.wire_width = 2;
        this.z_wire = -3;
        this.z_wire_erase = -2;
        this.z_rewire = -1;
    }
    adjust() {

        // get max step
        let max_step = 0;
        for (let operation of this.circuit_dict.operations) {
            max_step = Math.max(operation.step, max_step);
        }
        this.max_step = max_step;

        this.canvas_width = (max_step + 2) * this.x_step + this.x_padding * 2;
        this.canvas_height = (this.circuit_dict.num_qubit + this.circuit_dict.num_register + 0.5) * this.y_step;
    }

    draw() {
        const max_step = this.max_step;

        // draw qubit wire and name
        const num_qubit = this.circuit_dict.num_qubit;
        for (let qubit_index = 0; qubit_index < num_qubit; qubit_index += 1) {
            this.draw_wire(0.3, qubit_index, max_step + 1 + 0.8, qubit_index);
            let qubit_name = this.circuit_dict.qubit_name[qubit_index];
            if (qubit_name !== undefined) {
                this.draw_wire_name(qubit_index, qubit_name);
            }
            let output_name = this.circuit_dict.output_name[qubit_index];
            if (output_name !== undefined) {
                this.draw_output_name(max_step, qubit_index, output_name);
            }
        }

        // draw register wire and name
        const num_register = this.circuit_dict.num_register;
        for (let register_index = 0; register_index < num_register; register_index += 1) {
            this.draw_dual_wire(0.3, num_qubit + register_index, max_step + 1 + 0.8, num_qubit + register_index);
            let register_name = this.circuit_dict.register_name[register_index];
            if (register_name !== undefined) {
                this.draw_wire_name(num_qubit + register_index, register_name);
            }
        }

        // draw rewiring operation
        for (let operation of this.circuit_dict.operations) {
            this.draw_rewire_operation(num_qubit, operation)
        }

        // draw block operation
        for (let operation of this.circuit_dict.operations) {
            this.draw_block_operation(num_qubit, operation)
        }

        // finalize draw
        this.finalize_draw();
    }

    check_operation_type(operation) {
        if (operation.measurement) {
            return "MEASUREMENT";
        } else if (operation.name == "X" && operation.control.length + operation.control_neg.length >= 1) {
            return "CONTROL_X";
        } else if (operation.name == "Z" && operation.control.length == 1 && operation.control_neg.length == 0) {
            return "CONTROL_Z"
        } else if (operation.name == "SWAP" && operation.target.length == 2 && operation.control.length + operation.control_neg.length == 0) {
            return "SWAP";
        } else if (operation.name == "WIRE" && operation.target.length == 2 && operation.control.length + operation.control_neg.length == 0) {
            return "WIRE";
        } else if (this.is_subsequent(operation.target)) {
            return "MERGED_GATE"
        } else {
            return "NORMAL";
        }
    }
    get_position(pos_x, pos_y) {
        return [this.x_padding + pos_x * this.x_step, this.y_padding + pos_y * this.y_step];
    }
    draw_rewire_operation(_num_qubit, operation) {
        const step = operation.step + 1;
        if (!(operation.type == "SWAP" || operation.type == "WIRE")) return;

        // draw normal gates
        this.draw_gate(step, operation);

    }
    draw_block_operation(num_qubit, operation) {
        const qubit_connect_list = operation.target.concat(operation.control).concat(operation.control_neg);
        const min_qubit_index = Math.min.apply(Math, qubit_connect_list);
        const max_qubit_index = Math.max.apply(Math, qubit_connect_list);
        const min_condition_index = Math.min.apply(Math, operation.condition);
        const max_condition_index = Math.max.apply(Math, operation.condition);
        const min_outcome_index = Math.min.apply(Math, operation.outcome);
        const max_outcome_index = Math.max.apply(Math, operation.outcome);
        const step = operation.step + 1;
        if (operation.type == "SWAP" || operation.type == "WIRE") return;

        // draw wire connecting distance boxes
        if (operation.type != "MERGED_GATE") {
            this.draw_connect(step, min_qubit_index, max_qubit_index);
        }

        // draw wire to register
        if (operation.outcome.length > 0) {
            this.draw_dual_wire(step, max_qubit_index, step, num_qubit + max_outcome_index);
            for (let outcome_index of operation.outcome) {
                this.draw_not(step, num_qubit + outcome_index);
            }
        }

        // draw wire from register
        if (operation.condition.length > 0) {
            this.draw_dual_wire(step, max_qubit_index, step, num_qubit + max_condition_index);
            for (let condition_index of operation.condition) {
                this.draw_black_dot(step, num_qubit + condition_index);
            }
        }

        // draw normal gates
        this.draw_gate(step, operation);

        // draw control if one
        for (let control_index of operation.control) {
            this.draw_black_dot(step, control_index, operation.name);
        }

        // draw control if zero
        for (let control_index of operation.control_neg) {
            this.draw_white_dot(step, control_index, operation.name);
        }
    }

    is_subsequent(target_list) {
        if (target_list.length <= 1) return false;
        target_list.sort();
        let value = -1;
        for (let index of target_list) {
            if (value == -1) value = index;
            else if (index == value + 1) value += 1;
            else return false;
        }
        return true;
    }
    draw_gate(step, operation) {
        const target_list = operation.target;
        if (operation.classical) {
            console.log(target_list)
            for (let index in target_list) {
                target_list[index] += this.num_qubit;
            }
            console.log(target_list)
        }
        const name = operation.name;
        const type = operation.type;
        if (type == "MEASUREMENT") {
            for (let target_index of target_list) {
                this.draw_measurement(step, target_index, name);
            }
        } else if (type == "CONTROL_X") {
            for (let target_index of target_list) {
                this.draw_not(step, target_index);
            }
        } else if (type == "CONTROL_Z") {
            for (let target_index of target_list) {
                this.draw_black_dot(step, target_index);
            }
        } else if (type == "SWAP") {
            this.draw_rewire(step, target_list[0], target_list[1]);
            this.draw_rewire(step, target_list[1], target_list[0]);
        } else if (type == "WIRE") {
            this.draw_rewire(step, target_list[0], target_list[1]);
        } else if (this.is_subsequent(target_list)) {
            const min_target_index = Math.min.apply(Math, target_list);
            const max_target_index = Math.max.apply(Math, target_list);
            const color_fill = operation.color_fill;
            this.draw_merged_box(step, min_target_index, max_target_index, name, operation.color_fill, operation.color_stroke);
        } else {
            for (let target_index of target_list) {
                this.draw_box(step, target_index, name, operation.color_fill, operation.color_stroke);
            }
        }
    }
}


class QuantumCircuitDrawerTwo extends QuantumCircuitDrawerBase {
    init_application() {
        var params = { width: this.canvas_width, height: this.canvas_height };
        this.two = new Two(params).appendTo(this.tag);
        this.two.update();
    }

    draw_wire_name(pos_y, name) {
        const fontSize = this.x_step * 0.3;
        let pos = this.get_position(0, pos_y);
        this.two.makeText(name.trim(), pos[0], pos[1], { alignment: "center", size: fontSize });
    }
    draw_output_name(max_step, qubit_index, name) {
        const fontSize = this.x_step * 0.3;
        let pos = this.get_position(max_step + 2, qubit_index);
        this.two.makeText(name.trim(), pos[0], pos[1], { alignment: "center", size: fontSize });
    }
    draw_wire(pos_x_start, pos_y_start, pos_x_end, pos_y_end) {
        const pos1 = this.get_position(pos_x_start, pos_y_start);
        const pos2 = this.get_position(pos_x_end, pos_y_end);
        this.two.makeLine(pos1[0], pos1[1], pos2[0], pos2[1])
    }
    draw_dual_wire(pos_x_start, pos_y_start, pos_x_end, pos_y_end) {
        const wire_gap = this.y_step * 0.03;
        const pos1 = this.get_position(pos_x_start, pos_y_start);
        const pos2 = this.get_position(pos_x_end, pos_y_end);
        const angle = Math.atan2(pos2[1] - pos1[1], pos2[0] - pos1[0]) + Math.PI / 2;

        this.two.makeLine(
            pos1[0] + wire_gap * Math.cos(angle), pos1[1] + wire_gap * Math.sin(angle),
            pos2[0] + wire_gap * Math.cos(angle), pos2[1] + wire_gap * Math.sin(angle)
        );
        this.two.makeLine(
            pos1[0] - wire_gap * Math.cos(angle), pos1[1] - wire_gap * Math.sin(angle),
            pos2[0] - wire_gap * Math.cos(angle), pos2[1] - wire_gap * Math.sin(angle)
        );
    }
    draw_connect(pos_x, pos_y_start, pos_y_end) {
        const pos1 = this.get_position(pos_x, pos_y_start);
        const pos2 = this.get_position(pos_x, pos_y_end);
        this.two.makeLine(pos1[0], pos1[1], pos2[0], pos2[1])
    }

    draw_merged_box(pos_x, pos_y0, pos_y1, name, color_fill, color_stroke) {
        const squareWidth = this.x_step * 0.7;
        const squareHeight = this.y_step * (pos_y1 - pos_y0 + 1 - 0.3);
        const fontSize = this.x_step * 0.6 / Math.max(name.trim().length, 1);
        let pos = this.get_position(pos_x, (pos_y0 + pos_y1) / 2);
        let x = pos[0];
        let y = pos[1];
        var rect = this.two.makeRectangle(x, y, squareWidth, squareHeight);
        if (color_fill !== null) rect.fill = color_fill;
        else rect.fill = "#cde9f7";
        if (color_stroke !== null) rect.stroke = color_stroke;
        else rect.stroke = '#000000';
        this.two.makeText(name.trim(), x, y, { alignment: "center", size: fontSize });
    }
    draw_box(pos_x, pos_y, name, color_fill, color_stroke) {
        const squareWidth = this.x_step * 0.7;
        const squareHeight = this.y_step * 0.7;
        const fontSize = this.x_step * 0.5 / Math.max(name.trim().length, 1);
        let pos = this.get_position(pos_x, pos_y);
        let x = pos[0];
        let y = pos[1];

        var rect = this.two.makeRectangle(x, y, squareWidth, squareHeight);
        if (color_fill !== null) rect.fill = color_fill;
        else rect.fill = "#cde9f7";
        if (color_stroke !== null) rect.stroke = color_stroke;
        else rect.stroke = '#000000';

        this.two.makeText(name.trim(), x, y, { alignment: "center", size: fontSize });
    }
    draw_not(pos_x, pos_y) {
        const circleSize = this.x_step * 0.2;
        let pos = this.get_position(pos_x, pos_y);

        var circle = this.two.makeCircle(pos[0], pos[1], circleSize);
        circle.fill = "#ffffff";
        circle.stroke = '#000000';
        this.two.makeLine(pos[0], pos[1] + circleSize, pos[0], pos[1] - circleSize);
        this.two.makeLine(pos[0] + circleSize, pos[1], pos[0] - circleSize, pos[1]);
    }
    draw_black_dot(pos_x, pos_y) {
        const circleSize = this.x_step * 0.1;
        let pos = this.get_position(pos_x, pos_y);
        var circle = this.two.makeCircle(pos[0], pos[1], circleSize);
        circle.fill = "#000000";
        circle.stroke = '#000000';
    }
    draw_white_dot(pos_x, pos_y) {
        const circleSize = this.x_step * 0.1;
        let pos = this.get_position(pos_x, pos_y);
        var circle = this.two.makeCircle(pos[0], pos[1], circleSize);
        circle.fill = "#ffffff";
        circle.stroke = '#000000';
    }
    draw_rewire(pos_x, pos_y1, pos_y2) {
        const swap_gap = this.x_step * 0.6;
        let pos1 = this.get_position(pos_x, pos_y1);
        let pos2 = this.get_position(pos_x, pos_y2);
        var eraser = this.two.makeLine(pos1[0] - swap_gap / 2, pos1[1], pos1[0] + swap_gap / 2, pos1[1]);
        eraser.stroke = "#ffffff";
        eraser.linewidth = 3;
        this.two.makeLine(pos1[0] - swap_gap / 2, pos1[1], pos2[0] + swap_gap / 2, pos2[1]);
    }
    draw_measurement(pos_x, pos_y, name) {
        const squareWidth = this.x_step * 0.7;
        const squareHeight = this.y_step * 0.7;
        const arcSize = this.x_step * 0.2;
        const arrowSize = this.x_step * 0.3;
        const arrowAngle = -Math.PI * 0.3;
        const fontSize = 16;
        let pos = this.get_position(pos_x, pos_y);
        let x = pos[0];
        let y = pos[1];
        var rect = this.two.makeRectangle(x, y, squareWidth, squareHeight);
        rect.fill = "#ffffff"
        rect.stroke = '#000000';
        var arc = this.two.makeArcSegment(x, y + squareWidth * 0.0, arcSize, arcSize + 1, Math.PI, 2 * Math.PI);
        arc.fill = "#000000"
        arc.noStroke();
        this.two.makeLine(x, y + squareWidth * 0.05, x + arrowSize * Math.cos(arrowAngle), y + squareWidth * 0.05 + arrowSize * Math.sin(arrowAngle));
        this.two.makeText(name.trim(), x, y + this.y_step * 0.2, { alignment: "center", size: fontSize });
    }
    finalize_draw() {
        this.two.update();
    }
}

class QuantumCircuitDrawerPixi extends QuantumCircuitDrawerBase {
    init_application() {
        this.app = new PIXI.Application({ width: this.canvas_width, height: this.canvas_height, antialias: true, backgroundColor: 0xffffff });
        this.app.stage.sortableChildren = true;
        this.tag.appendChild(this.app.view)
    }

    draw_wire_name(pos_y, name) {
        const fontSize = this.x_step * 0.3;
        let pos = this.get_position(0, pos_y);
        const text = new PIXI.Text(name.trim(), { align: "center", fontSize: fontSize });
        text.x = pos[0];
        text.y = pos[1];
        text.anchor.x = 0.5;
        text.anchor.y = 0.5;
        this.app.stage.addChild(text);
    }
    draw_output_name(max_step, qubit_index, name) {
        const fontSize = this.x_step * 0.3;
        let pos = this.get_position(max_step + 2, qubit_index);
        const text = new PIXI.Text(name.trim(), { align: "center", fontSize: fontSize });
        text.x = pos[0];
        text.y = pos[1];
        text.anchor.x = 0.5;
        text.anchor.y = 0.5;
        this.app.stage.addChild(text);
    }
    draw_wire(pos_x_start, pos_y_start, pos_x_end, pos_y_end) {
        const wire = new PIXI.Graphics();
        wire.lineStyle(this.wire_width, 0x888888, 1);
        const pos1 = this.get_position(pos_x_start, pos_y_start);
        const pos2 = this.get_position(pos_x_end, pos_y_end);
        wire.moveTo(pos1[0], pos1[1]);
        wire.lineTo(pos2[0], pos2[1]);
        wire.zIndex = this.z_wire;
        this.app.stage.addChild(wire);
    }
    draw_dual_wire(pos_x_start, pos_y_start, pos_x_end, pos_y_end) {
        const wire_gap = this.y_step * 0.03;
        const wire_width = 1;
        const wire = new PIXI.Graphics();
        wire.lineStyle(wire_width, 0x000000, 1);
        const pos1 = this.get_position(pos_x_start, pos_y_start);
        const pos2 = this.get_position(pos_x_end, pos_y_end);
        const angle = Math.atan2(pos2[1] - pos1[1], pos2[0] - pos1[0]) + Math.PI / 2;
        wire.moveTo(pos1[0] + wire_gap * Math.cos(angle), pos1[1] + wire_gap * Math.sin(angle));
        wire.lineTo(pos2[0] + wire_gap * Math.cos(angle), pos2[1] + wire_gap * Math.sin(angle));
        wire.moveTo(pos1[0] - wire_gap * Math.cos(angle), pos1[1] - wire_gap * Math.sin(angle));
        wire.lineTo(pos2[0] - wire_gap * Math.cos(angle), pos2[1] - wire_gap * Math.sin(angle));
        this.app.stage.addChild(wire);
    }
    draw_connect(pos_x, pos_y_start, pos_y_end) {
        const wire = new PIXI.Graphics();
        wire.lineStyle(this.wire_width, 0x888888, 1);
        const pos1 = this.get_position(pos_x, pos_y_start);
        const pos2 = this.get_position(pos_x, pos_y_end);
        wire.moveTo(pos1[0], pos1[1]);
        wire.lineTo(pos2[0], pos2[1]);
        this.app.stage.addChild(wire);
    }

    draw_merged_box(pos_x, pos_y0, pos_y1, name, _color_fill, _color_stroke) {
        const squareWidth = this.x_step * 0.7;
        const squareHeight = this.y_step * (pos_y1 - pos_y0 + 1 - 0.3);
        const fontSize = this.x_step * 0.6 / Math.max(name.trim().length, 1);
        let pos = this.get_position(pos_x, (pos_y0 + pos_y1) / 2);
        let x = pos[0];
        let y = pos[1];
        const square = new PIXI.Graphics();
        square.lineStyle(2, 0x000000, 1);
        square.beginFill(0xcde9f7);
        square.drawRect(x - squareWidth / 2, y - squareHeight / 2, squareWidth, squareHeight);
        square.endFill();
        const text = new PIXI.Text(name.trim(), { align: "center", fontSize: fontSize });
        text.x = x;
        text.y = y;
        text.anchor.x = 0.5;
        text.anchor.y = 0.5;
        square.addChild(text);
        this.app.stage.addChild(square);
    }
    draw_box(pos_x, pos_y, name, _color_fill, _color_stroke) {
        const squareWidth = this.x_step * 0.7;
        const squareHeight = this.y_step * 0.7;
        const fontSize = this.x_step * 0.5 / Math.max(name.trim().length, 1);
        let pos = this.get_position(pos_x, pos_y);
        let x = pos[0];
        let y = pos[1];
        const square = new PIXI.Graphics();
        square.lineStyle(2, 0x000000, 1);
        square.beginFill(0xcde9f7);
        square.drawRect(x - squareWidth / 2, y - squareHeight / 2, squareWidth, squareHeight);
        square.endFill();
        const text = new PIXI.Text(name.trim(), { align: "center", fontSize: fontSize });
        text.x = x;
        text.y = y;
        text.anchor.x = 0.5;
        text.anchor.y = 0.5;
        square.addChild(text);
        this.app.stage.addChild(square);
    }
    draw_not(pos_x, pos_y) {
        const circleSize = this.x_step * 0.2;
        let pos = this.get_position(pos_x, pos_y);
        const circle = new PIXI.Graphics();
        circle.lineStyle(2, 0x000000, 1);
        circle.beginFill(0xFFFFFF, 1);
        circle.drawCircle(pos[0], pos[1], circleSize);
        circle.endFill();
        circle.moveTo(pos[0], pos[1] + circleSize);
        circle.lineTo(pos[0], pos[1] - circleSize);
        circle.moveTo(pos[0] + circleSize, pos[1]);
        circle.lineTo(pos[0] - circleSize, pos[1]);
        this.app.stage.addChild(circle);
    }
    draw_black_dot(pos_x, pos_y) {
        const circleSize = this.x_step * 0.1;
        let pos = this.get_position(pos_x, pos_y);
        const circle = new PIXI.Graphics();
        circle.lineStyle(2, 0x000000, 1);
        circle.beginFill(0x000000, 1);
        circle.drawCircle(pos[0], pos[1], circleSize);
        circle.endFill();
        this.app.stage.addChild(circle);
    }
    draw_white_dot(pos_x, pos_y) {
        const circleSize = this.x_step * 0.1;
        let pos = this.get_position(pos_x, pos_y);
        const circle = new PIXI.Graphics();
        circle.lineStyle(2, 0x000000, 1);
        circle.beginFill(0xFFFFFF, 1);
        circle.drawCircle(pos[0], pos[1], circleSize);
        circle.endFill();
        this.app.stage.addChild(circle);
    }
    draw_rewire(pos_x, pos_y1, pos_y2) {
        const swap_gap = this.x_step * 0.6;
        let pos1 = this.get_position(pos_x, pos_y1);
        let pos2 = this.get_position(pos_x, pos_y2);

        const wire_eraser = new PIXI.Graphics();
        wire_eraser.lineStyle(3, 0xFFFFFF, 1);
        wire_eraser.moveTo(pos1[0] - swap_gap / 2, pos1[1]);
        wire_eraser.lineTo(pos1[0] + swap_gap / 2, pos1[1]);
        wire_eraser.zIndex = this.z_wire_erase;

        const wire = new PIXI.Graphics();
        wire.lineStyle(2, 0x888888, 1);
        wire.moveTo(pos1[0] - swap_gap / 2, pos1[1]);
        wire.lineTo(pos2[0] + swap_gap / 2, pos2[1]);
        wire.zIndex = this.z_rewire;
        this.app.stage.addChild(wire);
        this.app.stage.addChild(wire_eraser);
    }
    draw_measurement(pos_x, pos_y, name) {
        const squareWidth = this.x_step * 0.7;
        const squareHeight = this.y_step * 0.7;
        const arcSize = this.x_step * 0.2;
        const arrowSize = this.x_step * 0.3;
        const arrowAngle = -Math.PI * 0.3;
        const fontSize = 16;
        let pos = this.get_position(pos_x, pos_y);
        let x = pos[0];
        let y = pos[1];
        const square = new PIXI.Graphics();
        square.lineStyle(2, 0x000000, 1);
        square.beginFill(0xFFFFFF);
        square.drawRect(x - squareWidth / 2, y - squareHeight / 2, squareWidth, squareHeight);
        square.endFill();
        const arc = new PIXI.Graphics();
        arc.lineStyle(2, 0x000000, 1);
        arc.arc(x, y + squareWidth * 0.0, arcSize, Math.PI, 2 * Math.PI);
        square.addChild(arc);
        const arrow = new PIXI.Graphics();
        arrow.lineStyle(2, 0x000000, 1);
        arrow.moveTo(x, y + squareWidth * 0.05);
        arrow.lineTo(x + arrowSize * Math.cos(arrowAngle), y + squareWidth * 0.05 + arrowSize * Math.sin(arrowAngle));
        square.addChild(arrow);
        if (name.trim().length == 0) name = "Z";
        const text = new PIXI.Text(name.trim(), { align: "center", fontSize: fontSize });
        text.x = x;
        text.y = y + this.y_step * 0.2;
        text.anchor.x = 0.5;
        text.anchor.y = 0.5;
        square.addChild(text);
        this.app.stage.addChild(square);
    }
    finalize_draw() {}
}