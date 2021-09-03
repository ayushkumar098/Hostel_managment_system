const express = require("express");
const session = require("express-session");
const bodyparser = require("body-parser");
const sqlite = require('sqlite3')
const nodemailer = require('nodemailer')

const app = express();

app.use(express.static("asset"));
app.use(bodyparser.urlencoded({
    extended:true
}));
app.set('view engine','ejs');
app.use(session({
    name: 'sid',
    resave: false,
    saveUninitialized: false,
    secret: 'thisismysectret.',
    cookie: {
        maxAge: 3600000,
        sameSite: true
    }
}));

var db = new sqlite.Database('database');

const mailercred = {
    email : "srm.mailer1@gmail.com",
    password : "mailer123"
}



function redirectLogin(req,res,next){
    if(!req.session.userID){
        res.redirect('/loginregister');
    } else {
        next();
    }
}

function redirectDashboard(req,res,next){
    if(req.session.userID){
        res.redirect('/dashboard');
    } else {
        next();
    }
}

app.get('/',redirectLogin,function(req,res){
    db.get(`select * from users where rowid=${req.session.userID}`,[],function(err,row){
        res.render('dashboard');
        console.log(row);
    })
});

app.get('/loginregister',redirectDashboard,function(req,res){
    res.render('loginregister',{
        error:''
    });
});

app.post('/login',redirectDashboard,function(req,res){
    let email = req.body.email;
    let password = req.body.password;

    //search in database
    db.get(`select rowid,* from users where email='${email}' and password='${password}'`,[],function(err,row){
        if(row){
            req.session.userID = row.rowid;
            return res.redirect('/');
        } else{
            console.log('something went wrong');
            console.log(err);
            res.render("loginregister",{
                error:'Wrong Credentials Please Try again'
            })
        }
    })
});

app.post('/register',redirectDashboard,function(req,res){
    const fname = req.body.name.split(" ")[0];
    const lname = req.body.name.split(" ")[1];
    const email = req.body.email;
    const password = req.body.password;
    //do some stuff...on sql
    db.run("insert into users(first_name,last_name,email,password) values(?,?,?,?)",[fname,lname,email,password],function(err){
        if(err){
            console.log(err);
            res.redirect("/error");
        } else {
            res.render("registerform");
        }
    })
});2

app.post("/fullregistration",redirectDashboard,function(req,res){
    const username = req.body.username;
    const college_name = req.body.college_name;
    const register_number = req.body.register_number;
    const program = req.body.program;
    const department = req.body.department;
    const semester = req.body.semester;
    const mobile = req.body.mobile;
    const hostel = req.body.hostel;
    const room_no = req.body.room_no;

    const toupdate = [username,college_name,register_number,program,department,semester,mobile,hostel,room_no];

    db.run("update users set username=?,college_name=?,register_number=?,program=?,department=?,semester=?,mobile=?,hostel=?,room_no=? where username is null",toupdate,function(err){
        if(err){
            res.redirect("/error");
        }else{
            res.redirect("/");
        }
    })
})

app.post("/complaint",redirectLogin,function(req,res){
    db.get(`select * from users where rowid=${req.session.userID}`,[],function(err,row){
        const first_name = row.first_name;
        const last_name = row.last_name;
        const email = row.email;
        const register_number = row.register_number;
        const hostel = row.hostel;
        const querry = req.body.querry;
        var hostelemailid = "";
        db.get('select * from hostels where name = ?',[hostel],function(err,innerrow){
            if(err){
                res.redirect('/error');
            }else {
                hostelemailid = innerrow.email;
                console.log("hostel email id is " + hostelemailid);
                var transporter = nodemailer.createTransport({
                    service: 'gmail',
                    auth: {
                        user: mailercred.email,
                        pass: mailercred.password
                    }
                })
                var mailobject = {
                    from: email,
                    to: hostelemailid,
                    subject: `New complaint registered by ${first_name}`,
                    text : `NAME : ${first_name} ${last_name}\nHOSTEL : ${hostel}\nROOM : ${row.room_no}\nREGISTER NO. : ${register_number} \nCOMPLAINT : ${querry}`
                };
                transporter.sendMail(mailobject,function(error,info){
                    if(error){
                        console.log(error);
                        res.redirect('/error')
                    } else {
                        console.log("Email sent : " + info.response);
                        res.redirect("/")
                    }
                })
            }
        })
    })
})

app.get('/logout',redirectLogin,function(req,res){
    req.session.destroy(function(err){
        if(err){
            res.redirect("/");
        }
        res.clearCookie('sid');
        res.redirect('/loginregister')
    });
})

app.get("/profile",redirectLogin,function(req,res){
    db.get(`select * from users where rowid=${req.session.userID}`,[],function(err,row){
        res.render('profile',{
            fname:row.first_name,
            lname:row.last_name,
            college:row.college_name,
            userid:row.username,
            email:row.email,
            ph:row.mobile,
            hostel:row.hostel,
            reg:row.register_number,
            prog:row.program,
            dep:row.department,
            sem:row.semester,
            room:row.room_no
        });
    })
});


app.get("/complain",redirectLogin,function(req,res){
    res.render("complain");
})

app.get("/schedule",redirectLogin,function(req,res){
    res.render("schedule");
})

app.get("/error",function(req,res){
    res.render("error");
});

app.get("/outpass",redirectLogin,function(req,res){
    db.get('select * from users where rowid = ?',[req.session.userID],function(err,row){
        db.get('select * from outpass where name = ?',[row.first_name],function(err,inrow){
            if(inrow == undefined){
                res.render("outpass",{
                    intime: "",
                    outtime: "",
                    reason: "",
                    status: "",
                });
            }else{
                res.render("outpass",{
                    intime: inrow.intime,
                    outtime: inrow.outtime,
                    reason: inrow.reason,
                    status: inrow.status
                })
            }
        })
    })
});


app.post("/outpass",redirectLogin,function(req,res){
    db.get(`select * from users where rowid=${req.session.userID}`,[],function(err,row){
        const first_name = row.first_name;
        const last_name = row.last_name;
        const email = row.email;
        const password = row.password;
        const register_number = row.register_number;
        const hostel = row.hostel;
        const intime = req.body.in;
        const outtime = req.body.out;
        const reason = req.body.reason;
        db.get('select * from hostels where name = ?',[hostel],function(err,innerrow){
            if(err){
                res.redirect('/error');
            }else {
                var hostelemailid = innerrow.email;
                // console.log("hostel email id is " + hostelemailid);
                db.run('insert into outpass values(?,?,?,?,?,?,?)',[first_name,register_number,hostel,intime,outtime,reason,"Pending"],function(err,lastrow){
                    if(!err){
                        console.log("outpass registered");
                    }
                })
                var transporter = nodemailer.createTransport({
                    service: 'gmail',
                    auth: {
                        user: mailercred.email,
                        pass: mailercred.password
                    }
                })
                var mailobject = {
                    from: email,
                    to: hostelemailid,
                    subject: `New Outpass request by ${first_name}`,
                    text : `NAME : ${first_name} \nREGISTER NO. : ${register_number} \nOut Time : ${intime} \nIn Time : ${outtime}\nReason : ${reason}\nValidation Link : http://localhost:3000/validate?name=${name}`
                };
                transporter.sendMail(mailobject,function(error,info){
                    if(error){
                        console.log(error);
                        res.redirect('/error')
                    } else {
                        console.log("Email sent : " + info.response);
                        res.redirect("/outpass")
                    }
                })
            }
        })
    })
});

app.get("/validate",function(req,res){
    var name = req.query.name;
    db.run('update outpass set status = "Accepted" where name = ?',[name],function(err){
        if(err){
            console.log(err);
            res.render("error");
        } else {
            res.render("outpass_accept",{
                name: name
            })
        }
    })
})

app.post("/delete_outpass",redirectLogin,function(req,res){
    db.get('select * from users where rowid = ?',[req.session.userID],function(err,row){
        db.run('delete from outpass where name = ?',[row.first_name],function(err){
            if(err){
                res.render("error");
            } else {
                res.redirect("/outpass")
            }
        })
    })
})

app.listen(3000,function(req,res){
    console.log("Listening on port 3000...");
});
