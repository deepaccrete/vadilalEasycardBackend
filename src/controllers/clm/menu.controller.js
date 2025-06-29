const Joi = require("joi");
const errorUtils = require("../../utils/errorHandler.utils");
const menu = require("../../models/clm/menu.model");
const winston = require("../../config/winston");

const menuProductSchema = (data, isUpdate) => {
    const schema = Joi.object({
        companyId: Joi.number().integer().min(1).required(),
        menuName: Joi.string().max(255).required(),
        menuType: Joi.number().integer().min(1).default(1),
        isActive: Joi.number().integer().valid(0, 1).required(),
        inclusiveExclusiveGst: Joi.number().integer().valid(0, 1).required(),
        orderTotalTaxProfileId: Joi.number().integer().min(0).optional(),
        companyBrandMappingId: Joi.number().integer().optional(),

        menuProductsData: Joi.array().items(
            Joi.object({
                menuProductId: Joi.when('$isUpdate', {
                    is: true,
                    then: Joi.number().integer().min(1),
                    otherwise: Joi.forbidden()
                }),
                isChecked: Joi.number().valid(0, 1).required(),
                isRebateEligible: Joi.number().valid(0, 1).optional(),
                // brandId: Joi.number().integer().optional(),
                productCategoryId: Joi.number().integer().min(1).required(),
                productSubCategoryId: Joi.number().integer().optional(),
                productPortionId: Joi.number().integer().min(1).required(),
                productId: Joi.number().integer().min(1).required(),
                portionId: Joi.number().integer().min(1).required(),
                productCode: Joi.string().max(255).required(),
                posPrice: Joi.number().required(),
                taxPricePos: Joi.number().required(),
                onlinePrice: Joi.number().required(),
                taxPriceOnline: Joi.number().required(),
                taxProfileId: Joi.number().integer().min(1).required(),
                serviceGoods: Joi.number().valid(1, 2).required(),
                priceEditable: Joi.number().valid(0, 1).required(),
                negativeSaleAllowed: Joi.number().valid(0, 1).required(),
            })
        ),
    });

    const { value, error } = schema.validate(data, { context: { isUpdate } }); // ✅ FIXED HERE
    if (error) throw errorUtils.createError(error.details[0].message.replace(/"/g, ''), 400);
    return value;
};

module.exports = {
    getMenuList: async (req, res) => {
        try {
            const data = req.body;
            if (!data.companyId || data.companyId === 0) throw errorUtils.createError('Invalid Company', 400);

            const resp = await menu.getMenuList(req)
            res.status(200).json({ success: 1, data: resp })
        } catch (error) {
            winston.error(error);
            res.status(error.statusCode || 500).json({ success: 0, msg: error.message });
        }
    },

    getOrderLevelTax: async (req, res) => {
        try {
            const data = req.body;
            if (!data.companyId || data.companyId === 0) throw errorUtils.createError('Invalid Company', 400);

            const resp = await menu.orderLevelTax(data.companyId)
            res.status(200).json({ success: 1, data: resp })
        } catch (error) {
            winston.error(error);
            res.status(error.statusCode || 500).json({ success: 0, msg: error.message });
        }
    },

    loadProductFromMenu: async (req, res) => {
        const schema = Joi.object({
            companyId: Joi.number().integer().min(1).required(),
            menuId: Joi.number().integer().min(1).required(),
        });
        const { value, error } = schema.validate(req.body);
        try {
            if (error) return res.status(400).json({ success: 0, msg: error.details[0].message.replace(/"/g, '') });

            const menuProducts = await menu.loadProductFromMenu(req);
            res.status(200).json({ success: 1, data: menuProducts })
        } catch (error) {
            winston.error(error);
            res.status(error.statusCode || 500).json({ success: 0, msg: error.message });
        }
    },

    loadFreshProductsForMenu: async (req, res) => {
        const schema = Joi.object({
            companyId: Joi.number().integer().min(1).required(),
            productIds: Joi.array().items(Joi.number().integer()).default([]),

        });
        try {
            const { value, error } = schema.validate(req.body);
            if (error)
                return res.status(400).json({
                    success: 0,
                    msg: error.details[0].message.replace(/"/g, ""),
                });

            if(!value.productIds.length) return res.status(400).json({success: 0, msg: "No Data Available"})
            const resp = await menu.loadFreshProductsForMenu(req);
            res.json({ success: 1, data: resp })
        }
        catch (error) {
            console.log(error)
            winston.error(error);
            res.status(error.statusCode || 500).json({ success: 0, msg: error.message });
        }
    },

    // loadProductDropdownFromMenu: async (req, res) => {
    //     const schema = Joi.object({
    //         menuId: Joi.number().integer().min(1).required(),
    //     });
    //     const { value, error } = schema.validate(req.body);
    //     try {
    //         if (error) return res.status(400).json({ success: 0, msg: error.details[0].message.replace(/"/g, '') });

    //         const menuProducts = await menu.loadProductDropdownFromMenu(value.menuId);
    //         res.status(200).json({ success: 1, data: menuProducts })
    //     } catch (error) {
    //         winston.error(error);
    //         res.status(error.statusCode || 500).json({ success: 0, msg: error.message });
    //     }
    // },

    createMenu: async (req, res) => {

        try {
            let value = await menuProductSchema(req.body);

            const resp = await menu.createMenu(value, req.user.userId, req.ip);
            res.status(resp.status).json(resp)
        } catch (error) {
            winston.error(error);
            res.status(error.statusCode || 500).json({ success: 0, msg: error.message });
        }
    },

    updateMenu: async (req, res) => {
        try {
            const menuId = req.params.menuId;
            if (!menuId) return res.status(400).json({ success: 0, msg: 'Invalid Menu' });

            let value = await menuProductSchema(req.body, true);

            const resp = await menu.updateMenu(value, menuId, req.user.userId, req.ip);
            res.status(resp.status).json(resp);
        } catch (error) {
            console.log('error============', error)
            winston.error(error);
            res.status(error.statusCode || 500).json({ success: 0, msg: error.message });
        }
    }
}