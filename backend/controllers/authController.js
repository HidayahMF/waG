const jwt = require("jsonwebtoken");
const { sql, poolPromise } = require("../config/db");


const login = async (req, res) => {
    try {

        const { nip, password } = req.body;

        if (!nip || !password) {
            return res.status(400).json({
                success: false,
                message: "nip dan password wajib diisi",
            });
        }

        // NIP yang boleh login
        const allowedNips = [
            "0377",
            "3490"

        ];

        // cek apakah nip diizinkan
        if (!allowedNips.includes(nip)) {
            return res.status(403).json({
                success: false,
                message: "NIP tidak memiliki akses login",
            });
        }

        const db = await poolPromise;



        if (!process.env.JWT_SECRET) {
            return res.status(500).json({
                success: false,
                message: "JWT_SECRET is not set on server",
            });
        }

        const result = await db.request()

            .input("nip", sql.VarChar, nip)
            .query(`
                    SELECT
                        Id_Employee,
                        nip,
                        Name AS nama,
                        Phone AS phone

                    FROM hris_Employee

                    WHERE nip = @nip
                `);

        const user = result.recordset?.[0];

        // cek user ada atau tidak
        if (!user) {
            return res.status(401).json({
                success: false,
                message: "NIP tidak ditemukan",
            });
        }

        // password = nomor hp
        if (password !== user.phone) {
            return res.status(401).json({
                success: false,
                message: "Password salah",
            });
        }

        // generate token
        const token = jwt.sign(
            {
                id: user.Id_Employee,
                nip: user.nip,
                nama: user.nama,
            },
            process.env.JWT_SECRET,
            {
                expiresIn: "7d",
            }
        );

        res.json({
            success: true,
            token,
            user: {
                id: user.Id_Employee,
                nip: user.nip,
                nama: user.nama,
            },
        });

    } catch (error) {

        console.error("[login] error:", error);
        res.status(500).json({
            success: false,
            message: "Server error",
            error: error?.message,
        });
    }
};


module.exports = {
    login,
};