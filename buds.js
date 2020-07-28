const Lang = imports.lang;
const { St, Gio } = imports.gi;
const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;
const GLib = imports.gi.GLib;
const Clutter = imports.gi.Clutter;
const Main = imports.ui.main;

function execCommunicate(argv) {
    let flags = (Gio.SubprocessFlags.STDOUT_PIPE |
                 Gio.SubprocessFlags.STDERR_PIPE);

    let proc = Gio.Subprocess.new(argv, flags);

    return new Promise((resolve, reject) => {
        proc.communicate_utf8_async(null, null, (proc, res) => {
            try {
                let [, stdout, stderr] = proc.communicate_utf8_finish(res);
                let status = proc.get_exit_status();

                if (status !== 0) {
                    throw new Gio.IOErrorEnum({
                        code: Gio.io_error_from_errno(status),
                        message: stderr ? stderr.trim() : GLib.strerror(status)
                    });
                }

                resolve(stdout.trim());
            } catch (e) {
                reject(e);
            }
        });
    });
}

var budsBattIndicator = new Lang.Class({

	Name : "BtGalaxyBudsBattIndicator",
	Extends: PanelMenu.Button,

	_init: function () {
		Log("Init budsBattIndicator");
		this.parent(0.0, "btGalaxyBudsBattIndicator");
		this.batteryStatusArray = ["N/A","N/A","N/A"];
		var hbox = new St.BoxLayout({ style_class: 'panel-status-menu-box bt-buds-batt-hbox' });
		this.icon = new St.Icon({
            style_class: 'system-status-icon'
        });
        this.icon.gicon = Gio.icon_new_for_string(imports.misc.extensionUtils.getCurrentExtension().path+"/icons/buds.svg");
		hbox.add_child(this.icon);

		this.buttonText = new St.Label({
				text: _('%'),
				y_align: Clutter.ActorAlign.CENTER,
				x_align: Clutter.ActorAlign.START
		});
		hbox.add_child(this.buttonText);

		this.add_child(hbox);
		this.leftBud = new PopupMenu.PopupMenuItem("-- N/A --");
		this.rightBud = new PopupMenu.PopupMenuItem("-- N/A --");
		this.case = new PopupMenu.PopupMenuItem("-- N/A --");
		
		this.menu.addMenuItem(this.rightBud);
		this.menu.addMenuItem(this.leftBud);
		this.menu.addMenuItem(this.case);
		Main.panel.addToStatusArea('BtGalaxyBudsBattIndicator', this, 1);
		this.hide();
		this.enabled = false;
		//this.syncBattery();
	},

	enable(macAdress){
		if (!this.enabled) {
			this.show();
			this.syncBattery(macAdress);
			this.event = GLib.timeout_add_seconds(0, 30,  () => {
				this.syncBattery(macAdress);
				return true;
			});
			this.enabled = true;
		}
	},

	disable(){
		if (this.enabled){
			this.hide();
			GLib.Source.remove(this.event);
			this.enabled = false;
		}
	},

	syncBattery : function(macAdress) {
		let argv = [imports.misc.extensionUtils.getCurrentExtension().path+"/buds_battery.py", macAdress+''];
		execCommunicate(argv).then(result => {
			var [leftBatt, rightBatt, caseBatt] = ["N/A","N/A","N/A"];
			[rightBatt, leftBatt, caseBatt] = result.split(','); 
			this.leftBud.label.set_text("Left: " + leftBatt + "%");
			this.rightBud.label.set_text("Right: " + rightBatt + "%");
			this.case.label.set_text("Case: " + caseBatt.trimEnd() + "%");
			if (parseInt(rightBatt) <= parseInt(leftBatt)){
				this.buttonText.set_text(rightBatt + "%");
			} else {
				this.buttonText.set_text(leftBatt + "%");
			}
			
		}).catch (e => {
			Log(e);
			this.hide();
		});
	},

	reset : function (){
		this.rightBud.destroy();
		this.leftBud.destroy();
		this.case.destroy();
		this.buttonText.destroy();
	},
	
	
});

var Log = function(msg) {
	log ("[budsBattery] " + msg);
}
