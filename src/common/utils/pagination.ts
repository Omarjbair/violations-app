import type { QueryFilter, Model, SortOrder } from 'mongoose';
import type { Paginated } from '../interfaces/pagination.interface.js';

export async function paginate<T>(
    model: Model<T>,
    filter: QueryFilter<T>,
    { page, limit }: { page: number; limit: number },
    sort: Record<string, SortOrder> = { _id: -1 },
): Promise<Paginated<T>> {
    const [data, total] = await Promise.all([
        model
            .find(filter)
            .sort(sort)
            .skip((page - 1) * limit)
            .limit(limit)
            .lean<T[]>(),
        model.countDocuments(filter),
    ]);

    return {
        data,
        pagination: {
            total,
            page,
            limit,
            total_pages: Math.ceil(total / limit),
        },
    };
}
