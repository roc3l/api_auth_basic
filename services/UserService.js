import { where } from 'sequelize';
import db from '../dist/db/models/index.js';
import bcrypt from 'bcrypt';

const createUser = async (req) => {
    const {
        name,
        email,
        password,
        password_second,
        cellphone
    } = req.body;
    if (password !== password_second) {
        return {
            code: 400,
            message: 'Passwords do not match'
        };
    }
    const user = await db.User.findOne({
        where: {
            email: email
        }
    });
    if (user) {
        return {
            code: 400,
            message: 'User already exists'
        };
    }

    const encryptedPassword = await bcrypt.hash(password, 10);

    const newUser = await db.User.create({
        name,
        email,
        password: encryptedPassword,
        cellphone,
        status: true
    });
    return {
        code: 200,
        message: 'User created successfully with ID: ' + newUser.id,
    }
};

const getUserById = async (id) => {
    return {
        code: 200,
        message: await db.User.findOne({
            where: {
                id: id,
                status: true,
            }
        })
    };
}

const updateUser = async (req) => {
    const user = db.User.findOne({
        where: {
            id: req.params.id,
            status: true,
        }
    });
    const payload = {};
    payload.name = req.body.name ?? user.name;
    payload.password = req.body.password ? await bcrypt.hash(req.body.password, 10) : user.password;
    payload.cellphone = req.body.cellphone ?? user.cellphone;
    await db.User.update(payload, {
        where: {
            id: req.params.id
        }

    });
    return {
        code: 200,
        message: 'User updated successfully'
    };
}

const deleteUser = async (id) => {
    /* await db.User.destroy({
        where: {
            id: id
        }
    }); */
    const user = db.User.findOne({
        where: {
            id: id,
            status: true,
        }
    });
    await  db.User.update({
        status: false
    }, {
        where: {
            id: id
        }
    });
    return {
        code: 200,
        message: 'User deleted successfully'
    };
}

const getAllUsers = async () => {
    try {
        const users = await db.User.findAll({
            where: {
                status: true
            }
        });
        return {
            code: 200,
            message: users
        };
    } catch (error) {
      console.error('Error al conseguir los usuarios', error);
      throw error;
    }
};

const findUsers = async (query) => {
    const filtroWhere = {};

    if (query.status !== undefined) {
        filtroWhere.status = query.status === "true";
        if (query.status == "true") {
            filtroWhere.status = true;
        }
        else {
            filtroWhere.status = false;
        }
    }

    if (query.name) {
        filtroWhere.name = {
            [db.Sequelize.Op.like]: `%${query.name}%` // Filtra usuarios que contengan el nombre
        };
    }

    if (query.createdBefore) {
        filtroWhere.updatedAt = {
            [db.Sequelize.Op.lt]: new Date(query.createdBefore) // Filtra usuarios creados antes de esta fecha
        };
    }

    if (query.createdAfter) {
        filtroWhere.updatedAt = {
            [db.Sequelize.Op.gt]: new Date(query.createdAfter) // Filtra usuarios creados después de esta fecha
        };
    }

    return {
        code: 200,
        message: await db.User.findAll({
            where: filtroWhere
        })
    };
};

const bulkCreateUser = async (usersList) => {
    let successCount = 0;
    let failureCount = 0;

    for (const user of usersList) {
        const { name, email, password, cellphone } = user;

        try {
            // Verificar si el usuario ya existe
            const existingUser = await db.User.findOne({ where: { email } });
            if (existingUser) {
                failureCount++;
                continue;
            }

            // Encriptar contraseña
            const encryptedPassword = await bcrypt.hash(password, 10);
            
            // Crear usuario
            try {
                await db.User.create({
                    name,
                    email,
                    password: encryptedPassword,
                    cellphone,
                    status: true
                });
                successCount++;
            } catch (error) {
                console.error('Error al crear usuario', error);
                failureCount++;
            }
            
        } catch (error) {
            console.error('Error al crear usuario', error);
            failureCount++;
        }
    }

    return {
        code: 200,
        message: `Creados correctamente: ${successCount}, fallidos: ${failureCount}`
    };
};

export default {
    createUser,
    getUserById,
    updateUser,
    deleteUser,
    getAllUsers,
    findUsers,
    bulkCreateUser,
}