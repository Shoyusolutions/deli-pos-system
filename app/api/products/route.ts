import { NextRequest, NextResponse } from 'next/server';
import connectMongo from '@/lib/mongodb';
import Product from '@/models/Product';
import PriceHistory from '@/models/PriceHistory';
import { createAuditLog, auditPriceChange } from '@/lib/auditLogger';

export async function GET(req: NextRequest) {
  try {
    await connectMongo();

    const { searchParams } = new URL(req.url);
    const upc = searchParams.get('upc');
    const storeId = searchParams.get('storeId');

    if (!storeId) {
      return NextResponse.json({ error: 'Store ID is required' }, { status: 400 });
    }

    if (upc) {
      const product = await Product.findOne({ upc, storeId });
      if (!product) {
        return NextResponse.json({ error: 'Product not found' }, { status: 404 });
      }
      return NextResponse.json(product);
    }

    const products = await Product.find({ storeId }).sort({ name: 1 });
    return NextResponse.json(products);
  } catch (error: any) {
    console.error('Error fetching products:', error);
    return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  let body: any;
  try {
    await connectMongo();

    body = await req.json();
    const { storeId, upc, name, price, cost, supplierId, supplierName, inventory, userId } = body;

    if (!storeId) {
      return NextResponse.json({ error: 'Store ID is required' }, { status: 400 });
    }

    const existingProduct = await Product.findOne({ upc, storeId });
    if (existingProduct) {
      return NextResponse.json({ error: 'Product with this UPC already exists in this store' }, { status: 400 });
    }

    const product = new Product({
      storeId,
      upc,
      name,
      price: parseFloat(price),
      cost: cost ? parseFloat(cost) : 0,
      supplierId: supplierId || '',
      supplierName: supplierName || '',
      inventory: parseInt(inventory) || 0
    });

    await product.save();

    // Create audit log for product creation
    await createAuditLog({
      storeId,
      userId,
      action: 'PRODUCT_CREATED',
      category: 'PRODUCT',
      entityType: 'Product',
      entityId: product._id.toString(),
      metadata: {
        upc: product.upc,
        productName: product.name,
        reason: 'New product added to inventory'
      },
      severity: 'INFO',
      success: true,
      request: req
    });

    // Create initial price history entry
    const priceHistory = new PriceHistory({
      storeId,
      productId: product._id,
      upc: product.upc,
      productName: product.name,
      oldPrice: 0,
      newPrice: product.price,
      oldCost: 0,
      newCost: product.cost || 0,
      changedBy: userId,
      changeReason: 'Initial product creation',
      effectiveDate: new Date()
    });
    await priceHistory.save();

    return NextResponse.json(product, { status: 201 });
  } catch (error: any) {
    console.error('Error creating product:', error);

    // Log the failure
    await createAuditLog({
      storeId: body?.storeId || 'unknown',
      userId: body?.userId,
      action: 'PRODUCT_CREATE_FAILED',
      category: 'PRODUCT',
      entityType: 'Product',
      severity: 'ERROR',
      success: false,
      errorMessage: error.message || 'Failed to create product',
      metadata: {
        upc: body?.upc,
        productName: body?.name
      },
      request: req
    });

    return NextResponse.json({ error: 'Failed to create product' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  let body: any;
  try {
    await connectMongo();

    body = await req.json();
    const { storeId, upc, name, price, cost, inventory, addInventory, setInventory, updateDetails, userId } = body;

    if (!storeId) {
      return NextResponse.json({ error: 'Store ID is required' }, { status: 400 });
    }

    const product = await Product.findOne({ upc, storeId });
    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    // Track old values for audit logging
    const oldPrice = product.price;
    const oldCost = product.cost;
    const oldInventory = product.inventory;
    const changes: any[] = [];

    // Handle bulk update from updateDetails
    if (updateDetails) {
      if (updateDetails.name !== undefined && updateDetails.name !== product.name) {
        changes.push({ field: 'name', oldValue: product.name, newValue: updateDetails.name });
        product.name = updateDetails.name;
      }
      if (updateDetails.price !== undefined) {
        const newPrice = parseFloat(updateDetails.price);
        if (newPrice !== product.price) {
          changes.push({ field: 'price', oldValue: product.price, newValue: newPrice });
          product.price = newPrice;
        }
      }
      if (updateDetails.cost !== undefined) {
        const newCost = parseFloat(updateDetails.cost);
        if (newCost !== product.cost) {
          changes.push({ field: 'cost', oldValue: product.cost, newValue: newCost });
          product.cost = newCost;
        }
      }
      // Always ensure supplierId and supplierName exist (even if empty)
      // This handles legacy products that might not have these fields
      if (product.supplierId === undefined) product.supplierId = '';
      if (product.supplierName === undefined) product.supplierName = '';
    } else {
      // Handle individual field updates
      if (name !== undefined && name !== product.name) {
        changes.push({ field: 'name', oldValue: product.name, newValue: name });
        product.name = name;
      }
      if (price !== undefined) {
        const newPrice = parseFloat(price);
        if (newPrice !== product.price) {
          changes.push({ field: 'price', oldValue: product.price, newValue: newPrice });
          product.price = newPrice;
        }
      }
      if (cost !== undefined) {
        const newCost = parseFloat(cost);
        if (newCost !== product.cost) {
          changes.push({ field: 'cost', oldValue: product.cost, newValue: newCost });
          product.cost = newCost;
        }
      }
      if (inventory !== undefined) {
        const newInventory = parseInt(inventory);
        if (newInventory !== product.inventory) {
          changes.push({ field: 'inventory', oldValue: product.inventory, newValue: newInventory });
          product.inventory = newInventory;
        }
      }
      if (addInventory !== undefined) {
        const addQty = parseInt(addInventory);
        const newInventory = product.inventory + addQty;
        changes.push({ field: 'inventory', oldValue: product.inventory, newValue: newInventory });
        product.inventory = newInventory;
      }
      // Handle setInventory for reconciliation (absolute value)
      if (setInventory !== undefined) {
        const newInventory = parseInt(setInventory);
        if (newInventory !== product.inventory) {
          changes.push({ field: 'inventory', oldValue: product.inventory, newValue: newInventory });
          product.inventory = newInventory;
        }
      }
    }

    await product.save();

    // Create price history record if price or cost changed
    if (oldPrice !== product.price || oldCost !== product.cost) {
      const priceHistory = new PriceHistory({
        storeId,
        productId: product._id,
        upc: product.upc,
        productName: product.name,
        oldPrice,
        newPrice: product.price,
        oldCost,
        newCost: product.cost,
        changedBy: userId,
        changeReason: 'Manual update',
        effectiveDate: new Date()
      });
      await priceHistory.save();

      // Create audit log for price change
      if (oldPrice !== product.price) {
        await auditPriceChange(storeId, product, oldPrice, product.price, userId);
      }
    }

    // Create general audit log for all changes
    if (changes.length > 0) {
      await createAuditLog({
        storeId,
        userId,
        action: 'PRODUCT_UPDATE',
        category: 'PRODUCT',
        entityType: 'Product',
        entityId: product._id.toString(),
        changes,
        metadata: {
          upc: product.upc,
          productName: product.name,
          reason: 'Manual product update'
        },
        severity: 'INFO',
        success: true,
        request: req
      });
    }

    return NextResponse.json(product);
  } catch (error: any) {
    console.error('Error updating product:', error);

    // Log the failure
    await createAuditLog({
      storeId: body?.storeId || 'unknown',
      userId: body?.userId,
      action: 'PRODUCT_UPDATE_FAILED',
      category: 'PRODUCT',
      entityType: 'Product',
      severity: 'ERROR',
      success: false,
      errorMessage: error?.message || 'Failed to update product',
      metadata: {
        upc: body?.upc
      },
      request: req
    });

    return NextResponse.json({ error: 'Failed to update product' }, { status: 500 });
  }
}